import JupyterReact from 'jupyter-react-js';
import components from './components'; 
import dispatcher from './components/dispatcher'; 
import react from 'react';
import reactDom from 'react-dom';

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
      JupyterReact.init( Jupyter, events, 'idaho.map', { components, on_update, save: false, react, reactDom } );
  });
}

module.exports = {
  load_ipython_extension: load_ipython_extension
};
