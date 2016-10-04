import React from 'react';
import { Map, TileLayer } from 'react-leaflet';
import CanvasLayer from './canvas_layer';
import dispatcher from './dispatcher.js';
import autobind from 'autobind-decorator';
import rtree from 'rtree';
import tilebelt from 'tilebelt';
import Slider from './slider';

import css from './css/map.css';

@autobind
class IdahoMap extends React.Component {

  tree: null
  renderedChips: null

  constructor( props ) {
    super( props );
    this.tree = rtree( 9 );
    this.renderedChips = {};
    this.state = {
      minDate: null,
      maxDate: null,
      selectedTiles: [],
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

  _indexFeatures( features ) {
    this.tree.geoJSON( {
      "type":"FeatureCollection",
      "features": features
    } );
  }

  componentWillReceiveProps( newProps ) {
    this._updateState( newProps );
  }

  componentWillMount(){
    const { features = [] } = this.props;

    if ( features.length ) {
      const dates = features.map( feature => feature.properties.acquisitionDate );
      this.props.minDate = Math.min( dates );
      this.props.maxDate = Math.max( dates );
      this._indexFeatures( features );
    }

    this._updateState( this.props );

    dispatcher.register( payload => {
      if ( payload.actionType === 'map_update' ) {
        const { data = {} } = payload;
        if ( data.features ) {
          this._updateFeatures( data.features );
        }
      }
    } );
  }

  _updateDates( dates ) {

  }

  _updateState( props ) {
    this.setState( { ...props } );
    this.forceUpdate();
  }

  _updateFeatures( newFeatures ) {
    this._indexFeatures( newFeatures );

    const _features = this.state.features.concat( newFeatures );

    const dates = _features.map( feature => new Date( feature.properties.acquisitionDate ) );
    const _min = new Date( Math.min.apply( null, dates ) );
    const _max = new Date( Math.max.apply( null, dates ) );

    this.setState( { features: _features, minDate: _min, maxDate: _max } );
  }

  @autobind
  updatePython( data ) {
    this.props.comm.send({ method: "update", data } );
  }

  onClick( loc ) {
    const xyz = tilebelt.pointToTile( loc.latlng.lng, loc.latlng.lat, 15 ).join(',');
    const chips = this.renderedChips[ xyz ];
    if ( chips && !~this.state.selectedTiles.indexOf( xyz ) ) {
      this.setState( { selectedTiles: [ ...this.state.selectedTiles, xyz ] } );
    } else {
      this.setState( { selectedTiles: [ ...this.state.selectedTiles.filter( t => t != xyz ) ] } );
    }
  }

  _bboxToTiles( bbox, zoom ) {
    const tiles = [];
    const ll = tilebelt.pointToTile( bbox[0], bbox[1], zoom );
    const ur = tilebelt.pointToTile( bbox[2], bbox[3], zoom );

    for ( let i = ll[0]; i < Math.min(ur[ 0 ] + 1 , 2**zoom); i++ ) {
      for ( let j = ur[1]; j < Math.min(ll[ 1 ] + 1, 2**zoom); j++ ) {
        tiles.push( [ i, j, zoom ] );
      }
    }
    return tiles;
  }

  _renderFeature( feature, ctx, map ) {
    const zoom = map.getZoom();
    if ( zoom < 6 ) {
      this._renderPoint( feature, ctx, map );
    } else if ( zoom <= 8 ){
      this._renderBox( feature, ctx, map );
    } else if ( zoom > 8 ) {
      const coords = feature.geometry.coordinates;
      const bbox = [ ...coords[0][ 0 ], ...coords[0][ 2 ] ];
      const tiles = this._bboxToTiles( bbox, 15 );
      tiles.forEach( tile => {
        const bbox = tilebelt.tileToBBOX( tile );
        this._renderChip( tile, bbox, feature, ctx, map );
      });
    }
  }

  _renderPoint( feature, ctx, map ) {
    const coords = feature.properties.center.coordinates;
    const dot = map.latLngToContainerPoint([coords[1], coords[0]]);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, Math.max(3, Math.floor( map.getZoom() * .75 )), 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
  }

  _renderBox( feature, ctx, map ) {
    const coords = feature.geometry.coordinates;
    const bbox = [ ...coords[0][ 0 ], ...coords[0][ 2 ] ];
    const ul = map.latLngToContainerPoint([bbox[3], bbox[0]]);
    const lr = map.latLngToContainerPoint([bbox[1], bbox[2]]);
    ctx.beginPath();
    ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
    ctx.stroke();
    ctx.closePath();
  }

  _renderChip( tile, bbox, feature, ctx, map ) {
    const ul = map.latLngToContainerPoint([bbox[3], bbox[0]]);
    const lr = map.latLngToContainerPoint([bbox[1], bbox[2]]);
    ctx.strokeStyle = 'rgba(0, 136, 204, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
    ctx.stroke();
    ctx.closePath();
    this._trackChip( tile.join( ',' ), feature );
  }

  _trackChip( xyz, feature ) {
    if ( !this.renderedChips[ xyz ] ) {
      this.renderedChips[ xyz ] = 0;
    }
    this.renderedChips[ xyz ] += 1;
  }

  draw( layer, params ) {
    const ctx = params.canvas.getContext( '2d' );
    ctx.clearRect(0, 0, params.canvas.width, params.canvas.height);

    const { bounds } = params;
    const bbox = [ bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth() ];
    const points = this.tree.bbox( ...bbox );

    this.renderedChips = {};

    if ( points.length ) {
      ctx.fillStyle = "rgba(0,136,204, 0.5)";
      ctx.strokeStyle = 'rgb(0,136,204)';
      ctx.lineWidth = 1;
      points.forEach( pnt => {
        this._renderFeature( pnt, ctx, layer._map );
      });
    }
  }

  drawSelected( layer, params ) {
    const ctx = params.canvas.getContext( '2d' );
    ctx.clearRect(0, 0, params.canvas.width, params.canvas.height);
    ctx.fillStyle = 'rgba( 200, 136, 204, 0.6 )';
    ctx.lineWidth = 1;

    const tiles = this.state.selectedTiles;
    tiles.forEach( tile => {
      const xyz = tile.split(',');
      const bbox = tilebelt.tileToBBOX( [parseInt( xyz[ 0 ] ), parseInt(xyz[1]), 15] );
      const ul = layer._map.latLngToContainerPoint([bbox[3], bbox[0]]);
      const lr = layer._map.latLngToContainerPoint([bbox[1], bbox[2]]);
      ctx.beginPath();
      ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
      ctx.fill();
      ctx.closePath();
    });
  }

  render() {
    const {
      minDate,
      maxDate,
      features,
      selectedTiles,
      width,
      height,
      zoom,
      baseLayer: { url, attribution },
      latitude,
      longitude } = this.state;

    const position = [latitude, longitude];
    console.log( minDate, maxDate );
    return (
      <div>
        <div className={css.header} ></div>
        <div className={css.row}>
          <Map center={position} zoom={ zoom } style={{ width, height }} onClick={ this.onClick } >
            <TileLayer
              url={ url }
              attribution={ attribution }
            />
            <CanvasLayer { ...this.props } draw={ this.draw } />
            { selectedTiles.length && <CanvasLayer { ...this.props } draw={ this.drawSelected } /> }
          </Map>
          <Slider { ...this.props } width={ width } />
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
