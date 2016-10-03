# Jupyter GlMap Components 

React components for jupyter-map-gl that can be used in different places.

## Install 

```bash
git clone git@github.com:timbr-io/idaho-map.git
cd idaho-map && python setup.py develop
jupyter notebook
```

## Usage 

```python 
from idaho_map import Map
from IPython.display import display
import requests
import json
import os
import threading


layers = [{
    'id': 'dg',
    'type': 'footprint',
    'geojson': {'features': []},
    'props': {
        'fill': '#00B2EE',
        'stroke': '#BFEFFF'
    }}]

idaho_map = Map(props={
     'width': 1000, 
     'height': 400,
     'latitude': 30.0,
     'longitude': 0.0,
     'zoom': 1,
     'tileSource': 'https://cartodb-basemaps-b.global.ssl.fastly.net/dark_all/{z}/{x}/{y}@2x.png',
     'layers': layers })

display(idaho_map)

def idaho_stream(config={"fromDate": "2015-01-01"}):
    r = requests.post('http://idaho.timbr.io/filter', json=config, stream=True)
    g = r.iter_lines()
    return g

def start(start, end, delay=None):
    stream = idaho_stream(config={"fromDate": start, "toDate": end})

    def fn():
        for msg in stream:
            idaho_map.add_features('dg', [json.loads(msg)])
        
    thread = threading.Thread(target=fn)
    thread.start()


start("2015-01-01", "2015-01-05")
```
