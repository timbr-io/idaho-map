import React from 'react';
import { Map, TileLayer } from 'react-leaflet';
import CanvasLayer from './canvas_layer';
import dispatcher from './dispatcher.js';
import autobind from 'autobind-decorator';
import rtree from 'rtree';
import tilebelt from 'tilebelt';
import moment from 'moment';
import Slider from './slider';
import List from './list';
import alphaify from 'alphaify';

import { scaleThreshold } from "d3-scale";

require( './css/map.css' );

const color = scaleThreshold()
  .domain([1, 3, 5, 10, 15, 20, 30, 40, 50])
  .range(['#4169e1','#3a84f1','#4a9ffa','#6db8fe','#95cfff','#c2e4ff','#f0f8ff']);

@autobind
class IdahoMap extends React.Component {

  tree: null
  renderedChips: null
  footprints: null

  constructor( props ) {
    super( props );
    this.tree = rtree( 9 );
    this.renderedChips = {};
    this.footprints = {};
    this.state = {
      userMinDate: null,
      userMaxDate: null,
      minDate: null,
      maxDate: null,
      processing: null,
      selectedDates: [],
      selectedTiles: [],
      features: [],
      width: 500,
      height: 400,
      zoom: 4,
      baseLayer: {
        url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}@2x.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      },
      latitude: 0.0,
      longitude: 0.0
    };
  }

  _indexFeatures( features ) {
    // could probably use reduce to do this...
    features.forEach( f => {
      const date = moment( f.properties.img_datetime_obj_utc.$date ).startOf('day').toString();
      if ( !this.footprints[ date ] ) {
        this.footprints[ date ] = 0;
      }
      this.footprints[ date ] += 1;
    });

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
      const dates = features.map( feature => new Date( feature.properties.img_datetime_obj_utc.$date ) );
      this.props.minDate = new Date( Math.min( dates ) );
      this.props.maxDate = new Date( Math.max( dates ) );
      this._indexFeatures( features );
    }

    this._updateState( this.props );

    dispatcher.register( payload => {
      if ( payload.actionType === 'map_update' ) {
        const { data = {} } = payload;
        if ( data.features ) {
          this._updateFeatures( data.features );
        } else if ( data.progress ) {
          this.setState( { processing: data.progress } );
        }

      }
    } );
  }

  _updateState( props ) {
    this.setState( { ...props } );
    this.forceUpdate();
  }

  _updateFeatures( newFeatures ) {
    this._indexFeatures( newFeatures );

    const _features = this.state.features.concat( newFeatures );

    const dates = _features.map( feature => new Date( feature.properties.img_datetime_obj_utc.$date ) );
    const _min = new Date( Math.min.apply( null, dates ) );
    const _max = new Date( Math.max.apply( null, dates ) );

    this.setState( { features: _features, minDate: _min, maxDate: _max } );
  }

  onClick( loc ) {
    /*const xyz = tilebelt.pointToTile( loc.latlng.lng, loc.latlng.lat, 15 ).join(',');
    const chips = this.renderedChips[ xyz ];
    if ( chips && !~this.state.selectedTiles.indexOf( xyz ) ) {
      this.setState( { selectedTiles: [ ...this.state.selectedTiles, xyz ] } );
    } else {
      this.setState( { selectedTiles: [ ...this.state.selectedTiles.filter( t => t != xyz ) ] } );
    }*/
  }

  onDrawBox( e ) {
    const coords = e.layer.toGeoJSON().geometry.coordinates[0];
    const tiles = this._bboxToTiles( coords[0].concat(coords[2]), 15, 1 );
    const selectedTiles = [];
    tiles.forEach( tile => {
      const xyz = tile.join(',');
      const chips = this.renderedChips[ xyz ];
      if ( chips ) {
        selectedTiles.push( xyz );
      }
    });
    this.setState( { selectedTiles } );
  }

  _bboxToTiles( bbox, zoom, buff=0 ) {
    const tiles = [];
    const ll = tilebelt.pointToTile( bbox[0], bbox[1], zoom );
    const ur = tilebelt.pointToTile( bbox[2], bbox[3], zoom );

    for ( let i = ll[0]+1-buff; i < Math.min(ur[ 0 ]+buff, 2**zoom); i++ ) {
      for ( let j = ur[1]+1-buff; j < Math.min(ll[ 1 ]+buff, 2**zoom); j++ ) {
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
        //this._renderChip( tile, bbox, feature, ctx, map );
        this._trackChip( tile, bbox, feature )
      });
    }
  }

  _renderPoint( feature, ctx, map ) {
    const coords = feature.properties.center.coordinates;
    const dot = map.latLngToContainerPoint([coords[1], coords[0]]);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, Math.max(3, Math.floor( map.getZoom() * .75 )), 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
  }

  _renderBox( feature, ctx, map ) {
    const coords = feature.geometry.coordinates;
    const bbox = [ ...coords[0][ 0 ], ...coords[0][ 2 ] ];
    const ul = map.latLngToContainerPoint([bbox[3], bbox[0]]);
    const lr = map.latLngToContainerPoint([bbox[1], bbox[2]]);
    ctx.beginPath();
    ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
    //ctx.closePath();
    ctx.stroke();
  }

  _renderChip( bbox, ctx, map, count ) {
    const ul = map.latLngToContainerPoint([bbox[3], bbox[0]]);
    const lr = map.latLngToContainerPoint([bbox[1], bbox[2]]);
    ctx.fillStyle = alphaify( color( count ), .5);
    ctx.beginPath();
    ctx.rect(ul.x, ul.y, lr.x - ul.x, lr.y - ul.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  _trackChip( tile, bbox, feature ) {
    const xyz = tile.join( ',' );
    if ( !this.renderedChips[ xyz ] ) {
      this.renderedChips[ xyz ] = [ ];
    }
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

      const min = userMinDate || minDate;
      const max = userMaxDate || maxDate;

      points.forEach( pnt => {
        // check min and max date
        const date = new Date( pnt.properties.img_datetime_obj_utc.$date );
        if ( date >= min && date <= max ) {
          this._renderFeature( pnt, ctx, layer._map );
        }
      });

      Object.keys( this.renderedChips ).forEach( xyz => {
        const tile = xyz.split( ',' );
        const bbox = tilebelt.tileToBBOX( [ parseInt( tile[ 0 ] ), parseInt( tile[ 1 ] ), 15 ] );
        this._renderChip( bbox, ctx, layer._map, this.renderedChips[ xyz ].length );
      })
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
    // values[0] = user's range begin number. values[1] = the range max - the user's range end number
    const minDate = new Date( this.state.minDate.getTime() );
    const maxDate = new Date( this.state.maxDate.getTime() );

    const min = new Date( minDate.setDate( minDate.getDate() + values[0] ) );
    const max = new Date( maxDate.setDate( maxDate.getDate() - values[1] ) );

    this.setState( { userMinDate: min, userMaxDate: max } );
  }

  saveChips( chips ) {
    this.props.comm.send( { method: "save_chips", chips } );
  }

  processChips() {
    const { selectedTiles, selectedDates } = this.state;
    if ( selectedDates.length ) {
      this.props.comm.send( { method: "stitch", chips: this._buildChips( selectedTiles, selectedDates ) } );
    }
  }

  _buildChips( selectedTiles, selectedDates ) {
    const chips = {};
    const dates = [];
    selectedTiles.forEach( tile => {
      if ( this.renderedChips[ tile ] ) {
        this.renderedChips[ tile ].forEach( f => {
          const date = new Date( f.properties.img_datetime_obj_utc.$date ).toISOString().substring( 0, 10 );
          if ( !selectedDates || ( selectedDates && selectedDates.length && ~selectedDates.indexOf( date ) ) ) {
            if ( !~dates.indexOf( tile + date ) ) {
              dates.push( tile + date );
              if ( !chips[ date ] ) {
                chips[ date ] = [];
              }
              chips[ date ].push( f );
            }
          }
        } );
      }
    });
    return chips;
  }

  selectDate( date ){
    const { selectedDates } = this.state;
    if ( !~selectedDates.indexOf( date ) ) {
      this.setState( { selectedDates: [ ...selectedDates, date ] });
    } else {
      this.setState( { selectedDates: [ ...selectedDates.filter( d => d !== date ) ] });
    }
  }

  selectAll() {
    this.setState( { selectedDates: Object.keys( this._buildChips( this.state.selectedTiles ) ) } );
  }
  
  clearSelection() {
    this.setState( { selectedDates: [] } );
  }

  render() {
    const {
      minDate,
      maxDate,
      userMinDate,
      userMaxDate,
      features,
      selectedDates,
      selectedTiles,
      processing,
      width,
      height,
      zoom,
      baseLayer: { url, attribution },
      latitude,
      longitude } = this.state;

    const position = [latitude, longitude];

    let chips = {};
    if ( selectedTiles.length ) {
      chips = this._buildChips( selectedTiles );
      this.saveChips( chips );
    }

    return (
      <div className={'idahomap'}>
        <div className={ 'header' } ></div>
        <div className={ 'row' }>
          <div className={'col-md-8'}>
            <Map center={position} zoom={ zoom } style={{ height }} >
              <TileLayer
                url={ url }
                attribution={ attribution }
              />
              <CanvasLayer { ...this.props } draw={ this.draw } type={'tiles'} onDrawBox={ this.onDrawBox }/>
              { selectedTiles.length && <CanvasLayer type={'selected'} { ...this.props } draw={ this.drawSelected } /> }
            </Map>
            <div className={'footer'}>
              <Slider
                { ...this.props }
                footprints={ this.footprints }
                minDate={ minDate }
                maxDate={ maxDate }
                userMinDate={ userMinDate }
                userMaxDate={ userMaxDate }
                width={ width }
                onChange={ this.sliderChange } />
            </div>
          </div>
          <div className={'col-md-4'}>
            <List { ...this.props } 
              chips={ chips } 
              processing={ processing } 
              processChips={ this.processChips } 
              select={ this.selectDate } 
              selectedDates={ selectedDates }
              selectAll={ this.selectAll }
              clearSelection={ this.clearSelection }
            />
          </div>
        </div>
      </div>
    );
  }
}

export default IdahoMap;
