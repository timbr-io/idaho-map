# IDAHO Map 

A visualization for selecting and process IDAHO Imagery from GBDX 

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

idaho_map = Map(props={
    'latitude': 8.999026053657794,
    'longitude': -79.56024169921875,
    'zoom': 10,
    'features': [],
    'baseLayer': {
        'url': 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}@2x.png'
    }
})

display(idaho_map)


def idaho_stream(config={"fromDate": "2015-01-01"}):
    r = requests.post('http://idaho.timbr.io/filter', json=config, stream=True)
    g = r.iter_lines()
    return g

def start(start, end, bbox=None, delay=None):
    stream = idaho_stream(config={"fromDate": start, "toDate": end, "bbox": bbox, "delay": delay})

    def fn():
        for msg in stream:
            idaho_map.add_features([json.loads(msg)])
        
    thread = threading.Thread(target=fn)
    thread.start()


start("2015-01-01", "2015-06-05", delay=0.1, bbox="-79.6641801, 8.9214493, -79.46418010000001, 9.1214493")

```
