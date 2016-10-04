from jupyter_react import Component

class Map(Component):
    module = 'Map'
    features = []

    def __init__(self, **kwargs):
        super(Map, self).__init__(target_name='idaho.map', props=kwargs.get('props', {}))
        self.layers = self.props.get('layers', [])
        self.on_msg(self._handle_msg)

    def add_features(self, features):
        self.send({ "method": "update", "props": {"features": features}})

    def _handle_msg(self, msg):
        data = msg['content']['data']
        if data.get('method', '') == 'notify':
            self.features = data.get('data', {}).get('features', [])
