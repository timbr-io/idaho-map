from jupyter_react import Component
from collections import defaultdict
import requests
import os, sys
import rasterio
from rasterio.merge import merge
import sh
from decimal import Decimal

from gbdxtools import Interface
gbdx = Interface()

class Map(Component):
    module = 'Map'
    features = []
    merged = []

    def __init__(self, **kwargs):
        super(Map, self).__init__(target_name='idaho.map', props=kwargs.get('props', {}))
        self.layers = self.props.get('layers', [])
        self.on_msg(self._handle_msg)

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
                chips[props['idahoID']].append(props)
            self.fetch_chips( chips )
        elif data.get('method', '') == 'save_chips':
            self.save_chips(data.get('chips', {}))

    def save_chips(self, raw_chips):
        self.chips = defaultdict(list)
        for date, chips in raw_chips.iteritems():
            for c in chips:
              props = c['properties']
              self.chips[props['idahoID']].append(props)
        

    def get_chip_url(self, mid, xyz):
        base = "http://idaho.geobigdata.io/v1/tile/idaho-images/{}".format(mid)
        return "{}/{}?bands=0,1,2,3,4,5,6,7&format=tif&token={}".format(
            base, '/'.join(map(str,[xyz[2],xyz[0],xyz[1]])), gbdx.gbdx_connection.access_token)

    def get_chip(self, name, mid, data, outdir):
        print name, mid
        url = self.get_chip_url(mid,  data['xyz'].split(','))
        path = os.path.join(outdir, name+'.vrt')
        #wgs84 = os.path.join(outdir, name+'_wgs84.tif')
    
        if not os.path.exists(path):
            print 'Retrieving Chip', path, url 
            bounds = data['bbox']
            affine = [bounds[0], (bounds[2] - bounds[0]) / 256, 0.0, bounds[3], 0.0, (bounds[1] - bounds[3]) / 256] 
            xform = ','.join(['%.15e' % Decimal(x) for x in affine])
            #print affine
            data = { 'url':'{}/{}'.format('/vsizip/vsicurl', url), 'geotransform': xform }
            with open(path, 'w') as vrt:
                with open(os.path.join(os.path.dirname(__file__), 'vrt_chip_template.txt'), 'r') as template:
                    vrt.write( template.read() % data )
              
            #r = requests.get(url)
            #if r.status_code == 200:
            #    with open(path, 'wb') as the_file:
            #        the_file.write(r.content)
            #else:
            #    self.send({ "method": "update", "props": {"progress": { "status": "error", "text": 'There was a problem retrieving IDAHO Image {}'.format(url) }}})
            #    r.raise_for_status()
    
            ## georef the file 
            #print data['bbox'], data['xyz']
            #opts = ["-of", "GTiff", "-a_ullr", bounds[0], bounds[3], bounds[2], bounds[1], "-a_srs", "EPSG:4326",  path, wgs84]
            #try: 
            #  gdal_translate = sh.Command(os.path.join(os.path.dirname(sys.executable), "gdal_translate"))
            #except:
            #  gdal_translate = sh.Command("gdal_translate")

            #result = gdal_translate(*opts)

        return path

    def fetch_chips(self, chips=None):
        if chips is None:
            chips = self.chips
        self.merged = []
        total = len(sum(chips.values(), []))
        current = 0
        for idaho_id in chips.keys():
            img_dir = os.path.join(os.environ.get('HOME','./'), 'gbdx', 'idaho', idaho_id)

            if not os.path.exists(img_dir):
                os.makedirs(img_dir)

            files = []
            for i, t in enumerate(chips[idaho_id]):
                current += 1 
                text = 'Fetching {} of {} chips'.format(current, total)
                self.send({ "method": "update", "props": {"progress": { "status": "processing", "percent": (float(current) / float(total)) * 100, "text": text }}})
                files.append( self.get_chip(t['xyz'].replace(',','_'), idaho_id, t, img_dir) )
            #self.merge_chips(files, idaho_id)
        
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
