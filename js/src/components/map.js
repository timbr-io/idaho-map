import React from 'react';
import { Map, TileLayer } from 'react-leaflet';
import Footprints from './footprints';
import dispatcher from './dispatcher.js';
import autobind from 'autobind-decorator';

import css from './css/map.css';

@autobind
class IdahoMap extends React.Component {

  constructor( props ) {
    super( props );
    this.state = {
      features: [],
      width: 500,
      height: 400,
      zoom: 4,
      baseLayer: {
        url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      },
      latitude: 0.0,
      longitude: 0.0
    };
  }

  componentWillReceiveProps( newProps ) {
    console.log('new props')
    this._updateState( newProps );
  }

  componentWillMount(){
    this._updateState( this.props );
    /*dispatcher.register( payload => {
      if ( payload.actionType === 'map_update' ) {
        const { data = {} } = payload;
        if ( data.features && data.layerId ) {
          this._updateFeatures( data.layerId, data.features );
        } else if ( data.layers ) { 
          this._updateLayers( data.layers );
        }
      }
    } );*/
  }

  _updateState( props ) {
    this.setState( { ...props } );
    this.forceUpdate();
  }

  _updateFeatures( newFeatures ) {
    this.setState( { features: this.state.concat( newFeatures ) } );
  }

  @autobind
  updatePython( data ) {
    this.props.comm.send({ method: "update", data } );
  }

  onClick() {
    console.log(arguments);
    // dispatch event? 
  }

  render() {
    const { 
      features,
      width, 
      height, 
      zoom, 
      baseLayer: { url, attribution },
      latitude, 
      longitude } = this.state;

    const position = [longitude, latitude];

    return (
      <div>
        <div className={css.header} ></div>
        <div className={css.row}>
          <Map center={position} zoom={ zoom } style={{ width, height }} onClick={ this.onClick } >
            <TileLayer
              url={ url }
              attribution={ attribution }
            />
            <Footprints features={ features } />
          </Map>
        </div>
        <div className={css.footer}>
          <div className={'slider'}></div>
          <div className={css.button}>Process</div>
        </div>
      </div>
    );
  }
}

export default IdahoMap;
