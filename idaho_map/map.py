from jupyter_react import Component
from collections import defaultdict
import requests
import os
import rasterio
from rasterio.merge import merge

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
            self.stitch(data.get('chips', {}))

    def stitch(self, raw_chips):
        images = []
        for chip in raw_chips:
            for xyz, imgs in chip.iteritems():
                for img in imgs:
                    img['properties']['xyz'] = xyz
                    images.append(img)
        
        chips = defaultdict(list)
        for f in images:
            p = f['properties']
            chips[p['idahoID']].append(p)
        
        self.fetch_chips(chips)
            

    def get_chip_url(self, mid, zxy):
        base = "http://idaho.geobigdata.io/v1/tile/idaho-images/{}".format(mid)
        return "{}/{}?bands=0,1,2,3,4,5,6,7&format=tif&token={}".format(
            base, '/'.join(map(str,[zxy[2],zxy[0],zxy[1]])), gbdx.gbdx_connection.access_token)

    def get_chip(self, name, mid, data, outdir):
        url = self.get_chip_url(mid, data['xyz'].split(','))
        path = os.path.join(outdir, name+'.tif')
        wgs84 = os.path.join(outdir, name+'_wgs84.tif')
    
        if not os.path.exists(path):
            print 'Retrieving Chip', path
            r = requests.get(url)
            if r.status_code == 200:
                with open(path, 'wb') as the_file:
                    the_file.write(r.content)
            else:
                print('There was a problem retrieving IDAHO Image', url)
                r.raise_for_status()

            # georef the file 
            bounds = data['bounds']
            cmd = "gdal_translate -of GTiff -a_ullr {} {} {} {} -a_srs EPSG:4326 {} {}".format(bounds[0], bounds[3], bounds[2], bounds[1], path, wgs84)
            os.system(cmd) 

        return wgs84

    def fetch_chips(self, chips):
        for idaho_id in chips.keys():
            img_dir = os.path.join(os.environ.get('HOME','./'), 'gbdx', 'idaho', idaho_id)

            if not os.path.exists(img_dir):
                os.makedirs(img_dir)
    
            self.merge_chips([self.get_chip('{}_{}'.format(idaho_id,i), idaho_id, t, img_dir) for i,t in enumerate(chips[idaho_id])], idaho_id)

    def merge_chips(self, files, idaho_id):
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
