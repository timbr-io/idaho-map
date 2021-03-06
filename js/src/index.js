import JupyterReact from 'jupyter-react-js';
import components from './components'; 
import dispatcher from './components/dispatcher'; 

const on_update = ( module, props ) => {
  dispatcher.dispatch({
    actionType: module.toLowerCase() + '_update',
    data: props 
  });
}

function load_ipython_extension () {
  requirejs([
      "base/js/namespace",
      "base/js/events",
  ], function( Jupyter, events ) {
      let link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "//cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/leaflet.css";
      document.getElementsByTagName("head")[0].appendChild(link);

      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "//cdnjs.cloudflare.com/ajax/libs/leaflet.draw/0.3.2/leaflet.draw.css";
      document.getElementsByTagName("head")[0].appendChild(link);

      //var script = document.createElement( 'script' );
      //script.src = 'http://localhost:3001/notebook.js';
      //document.getElementsByTagName( 'head' )[0].appendChild( script );

      JupyterReact.init( Jupyter, events, 'idaho.map', { components, on_update, save: false } );
  });
}

module.exports = {
  load_ipython_extension: load_ipython_extension
};
