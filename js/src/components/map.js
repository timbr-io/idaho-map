import React from 'react';
import { Map, TileLayer } from 'react-leaflet';
import CanvasLayer from './canvas_layer';
import dispatcher from './dispatcher.js';
import autobind from 'autobind-decorator';
import rtree from 'rtree';
import tilebelt from 'tilebelt';
import Slider from './slider';
import List from './list';

require( './css/map.css' );

@autobind
class IdahoMap extends React.Component {

  tree: null
  renderedChips: null

  constructor( props ) {
    super( props );
    this.tree = rtree( 9 );
    this.renderedChips = {};
    this.state = {
      userMinDate: null,
      userMaxDate: null,
      minDate: null,
      maxDate: null,
      processing: false,
      dates: new Set(),
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

    this.setState( { features: _features, minDate: _min, maxDate: _max, dates: new Set( dates ) } );
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

    for ( let i = ll[0]+1; i < Math.min(ur[ 0 ], 2**zoom); i++ ) {
      for ( let j = ur[1]+1; j < Math.min(ll[ 1 ], 2**zoom); j++ ) {
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
    ctx.beginPath();
    ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
    this._trackChip( tile, feature );
  }

  _trackChip( tile, feature ) {
    const xyz = tile.join( ',' ); 
    if ( !this.renderedChips[ xyz ] ) {
      this.renderedChips[ xyz ] = [];
    }
    const bbox = tilebelt.tileToBBOX( [ parseInt( tile[ 0 ] ), parseInt( tile[ 1 ] ), 15 ] );
    this.renderedChips[ xyz ].push( { ...feature, properties: { ...feature.properties, xyz, bbox } } );
  }

  draw( layer, params ) {
    const { userMinDate, userMaxDate, minDate, maxDate } = this.state;
  
    const ctx = params.canvas.getContext( '2d' );
    ctx.clearRect(0, 0, params.canvas.width, params.canvas.height);

    const { bounds } = params;
    const bbox = [ bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth() ];
    const points = this.tree.bbox( ...bbox );

    this.renderedChips = {};

    if ( points.length ) {
      ctx.strokeStyle = 'rgba(0, 136, 204, 0.4)';
      ctx.fillStyle = 'rgba(0, 136, 204, 0.1)';
      ctx.lineWidth = 0.5;
      points.forEach( pnt => {
        // check min and max date 
        const date = new Date( pnt.properties.acquisitionDate );
        const min = userMinDate || minDate;
        const max = userMaxDate || maxDate;
        if ( date <= new Date( max ) && date >= new Date( min ) ) {
          this._renderFeature( pnt, ctx, layer._map );
        }
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

  sliderChange( values ) {
    const dates = [ ...this.state.dates ];
    this.setState( { userMinDate: dates[ values[ 0 ] ], userMaxDate: dates[ values[ 1 ] - 1 ] } );
  }
  
  saveChips( chips ) {
    if ( chips.length ) {
      this.props.comm.send( { method: "save_chips", chips } );
    }
  }

  processChips() {
    this.props.comm.send( { method: "stitch" } );
  }

  render() {
    const {
      minDate,
      maxDate,
      userMinDate,
      userMaxDate,
      features,
      selectedTiles,
      width,
      height,
      zoom,
      baseLayer: { url, attribution },
      latitude,
      longitude } = this.state;

    const position = [latitude, longitude];

    const chips = selectedTiles.map( tile => ( { [ tile ]: this.renderedChips[ tile ] } ) ) || [];
    this.saveChips( chips );

    return (
      <div className={'idahomap'}>
        <div className={ 'header' } ></div>
        <div className={ 'row' }>
          <div className={'col-md-8'}>
            <Map center={position} zoom={ zoom } style={{ height }} onClick={ this.onClick } >
              <TileLayer
                url={ url }
                attribution={ attribution }
              />
              <CanvasLayer { ...this.props } draw={ this.draw } />
              { selectedTiles.length && <CanvasLayer { ...this.props } draw={ this.drawSelected } /> }
            </Map>
            <div className={'footer'}>
              <Slider 
                { ...this.props } 
                minDate={ minDate } 
                maxDate={ maxDate } 
                userMinDate={ userMinDate } 
                userMaxDate={ userMaxDate } 
                width={ width } 
                onChange={ this.sliderChange } />
            </div>
          </div>
          <div className={'col-md-4'}>
            <List { ...this.props } chips={ chips } processChips={ this.processChips }/>
            <div className={'progress'}>
              <div className={'progress-bar'} style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default IdahoMap;
