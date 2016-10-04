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

idaho_map = Map(props={
    'width': 500, 
    'height': 400,
    'latitude': 0.0,
    'longitude': 0.0,
    'zoom': 2
})

display(idaho_map)
```
