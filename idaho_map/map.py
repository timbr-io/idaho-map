from jupyter_react import Component
from collections import defaultdict
import requests
import os, sys
import rasterio
from rasterio.merge import merge
import sh
from decimal import Decimal
import mercantile 
import json

from boto.s3.connection import S3Connection
s3 = S3Connection()

from gbdxtools import Interface
gbdx = Interface()

import tempfile
import threading

class Map(Component):
    module = 'Map'
    features = []
    merged = []

    def __init__(self, **kwargs):
        super(Map, self).__init__(target_name='idaho.map', props=kwargs.get('props', {}))
        self.stream_config = self.props.get('stream', {})
        self.on_msg(self._handle_msg)

    def idaho_stream(self, config={"fromDate": "2015-01-01", "toDate": "2015-06-02", "delay":"0.1", "bbox": "-24.521484,21.983801,43.154297,55.002826"}):
        r = requests.post('http://idaho.timbr.io/filter', json=config, stream=True)
        g = r.iter_lines()
        return g

    def start(self, config=None):
        if config is None:
            config = self.stream_config
        stream = self.idaho_stream(config=config)
    
        def fn():
            for msg in stream:
                self.add_features([json.loads(msg)])
        
        thread = threading.Thread(target=fn)
        thread.start()

    def add_features(self, features):
        self.send({ "method": "update", "props": {"features": features}})

    def _handle_msg(self, msg):
        data = msg['content']['data']
        if data.get('method', '') == 'stitch':
            chips = defaultdict(list)
            raw = data.get('chips', {})
            for date, _chips in raw.iteritems():
              for c in _chips:
                props = c['properties']
                chips[c['id']].append(props)
            self.fetch_chips( chips )
        elif data.get('method', '') == 'save_chips':
            self.save_chips(data.get('chips', {}))

    def save_chips(self, raw_chips):
        self.chips = defaultdict(list)
        for date, chips in raw_chips.iteritems():
            for c in chips:
              props = c['properties']
              self.chips[c['id']].append(props)
        

    def get_vrt(self, tile, idaho_id):
        bnds = mercantile.bounds(tile)
        x_res, y_res = (bnds.east - bnds.west) / 256, (bnds.south - bnds.north) / 256
        _bucket = s3.get_bucket('idaho-images')
        _rrds = json.loads(_bucket.get_key('{}/rrds.json'.format(idaho_id)).get_contents_as_string())
  
        level = 0
        for i, r in enumerate(_rrds['reducedResolutionDataset']):
            warp = json.loads(_bucket.get_key('{}/native_warp_spec.json'.format(r['targetImage'])).get_contents_as_string())
            _x, _y = (warp['targetGeoTransform']['scaleX'], warp['targetGeoTransform']['scaleY'])
            if _x < x_res and _y < y_res:
                level = i

        return 'http://idaho.timbr.io/{}/toa/{}.vrt'.format( idaho_id, level )

    def pixel_box(self, src, bounds):
        bbox = [bounds.east, bounds.south, bounds.west, bounds.north]
        ul = src.index(*bbox[0:2])
        lr = src.index(*bbox[2:4])
        
        if ul[0] < 0:
            ul = (0, ul[1])
        if ul[1] < 0:
            ul = (ul[0], 0)
        
        if lr[0] > src.height:
            lr = (src.width, lr[1])
        if lr[1] > src.width:
            lr = (lr[0], src.height)
            
        return ((lr[0], ul[0]+1), (lr[1], ul[1]+1))
    
    def get_tile(self, idaho_id, tile, vrt, bucket_name, label):
        bucket = s3.create_bucket(bucket_name)
        path = '{}/{}/{}/{}/{}.tif'.format(label, idaho_id, tile[-1], tile[0], tile[1])
        key = bucket.get_key(path)
    
        if key is not None:
            return 's3://{}/{}'.format(bucket_name, path)
        else:
            bounds = mercantile.bounds(tile)
            scaleX, scaleY = (bounds.east - bounds.west) / 256, (bounds.south - bounds.north) / 256

            window = self.pixel_box(vrt, bounds)
            bands = vrt.read(window=window)                
            
            profile = vrt.profile
            profile['transform'] = (bounds.east, scaleX, 0.0, bounds.north, 0.0, scaleY)
            profile['height'] = 256
            profile['width'] = 256
            profile['driver'] = 'GTiff'

            temp = tempfile.NamedTemporaryFile(suffix=".tif")
            with rasterio.open(temp.name, 'w', **profile) as dst:
                dst.write(bands)
        
            bucket = s3.create_bucket(bucket_name)
            path = '{}/{}/{}/{}/{}.tif'.format(label, idaho_id, tile[-1], tile[0], tile[1])
            key = bucket.new_key(path)
            key.set_contents_from_filename(temp.name)
            temp.delete
            return 's3://{}/{}'.format(bucket_name, path)

    def fetch_chips(self, chips=None):
        if chips is None:
            chips = self.chips
        self.merged = []
        total = len(sum(chips.values(), []))
        current = 0
        for idaho_id in chips.keys():
            img_dir = os.path.join(os.environ.get('HOME','./'), 'gbdx', 'idaho', idaho_id)
            url = 'http://idaho.timbr.io/{}/TOAReflectance/0.vrt'.format( idaho_id )
            vrt = requests.get(url).text
            with rasterio.open(vrt) as src:
                files = []
                for i, chip in enumerate(chips[idaho_id]):
                    tile = map(int, chip['xyz'].split(','))
                    current += 1 
                    text = 'Fetching {} of {} chips'.format(current, total)
                    self.send({ "method": "update", "props": {"progress": { "status": "processing", "percent": (float(current) / float(total)) * 100, "text": text }}})
                    files.append( self.get_tile(idaho_id, tile, src, 'idaho-lambda', 'toa') )

            self.merge_chips(files, idaho_id)
        
        self.send({ "method": "update", "props": {"progress": { "status": "complete" }}})
        return files

    def merge_chips(self, files, idaho_id):
        print 'merging', files
        sources = [rasterio.open(f) for f in files]
        dest, output_transform = merge(sources)

        profile = sources[0].profile
        profile['transform'] = output_transform
        profile['height'] = dest.shape[1]
        profile['width'] = dest.shape[2]
        profile['driver'] = 'GTiff'

        img_dir = os.path.join(os.environ.get('HOME','./'), 'gbdx', 'idaho', idaho_id)
        output = img_dir + '/merge.tif'
        with rasterio.open(output, 'w', **profile) as dst:
            dst.write(dest)
        self.merged.append( output )
