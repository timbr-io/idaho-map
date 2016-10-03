from .map import Map

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'idaho_map_gl',
        'require': 'idaho_map/index'
    }]
