import React from 'react';
import autobind from 'autobind-decorator';

require('rc-slider/assets/index.css');
import ReactSlider from 'rc-slider';

@autobind
export default class Slider extends React.Component {

  constructor( props ) {
    super( props );
    this.state = {
      play: false,
      max: null,
      userMin: null,
      userMax: null
    };
  }

  componentDidMount() {
    this.updateMaxes( this.props );
  }

  componentWillReceiveProps( nextProps ) {
    this.updateMaxes( nextProps );
  }

  componentWillUpdate( nextProps, nextState ) {
    if ( nextState.play ) {
      this.play( nextState.userMin, nextState.userMax );
    }
  }

  updateMaxes( props ) {
    const { maxDate, minDate, userMinDate, userMaxDate, onChange } = props;
    const max = maxDate && minDate ? this.diffDays( maxDate, minDate ) : 0;
    const userMin = minDate && userMinDate && userMinDate !== minDate ? this.diffDays( userMinDate, minDate ) : 0;
    const userMax = maxDate && userMaxDate && userMaxDate !== maxDate ? max - this.diffDays( maxDate, userMaxDate ) : max;

    this.setState( { max: max, userMin: userMin, userMax: userMax } );
  }

  diffDays( max, min ) {
    return Math.round( Math.abs( ( max.getTime() - min.getTime() ) / ( 24*60*60*1000 ) ) );
  }

  togglePlay( event ) {
    event.preventDefault();
    this.setState( { play: !this.state.play } );
  }

  play( userMin, userMax ) {
    let min, max;
    if ( userMax < this.state.max ) {
      min = userMin + 1;
      max = userMax + 1;
    } else {
      min = 0;
      max = userMax - userMin;
    }
    return setTimeout( () => this.props.onChange( [ min, this.state.max - max ] ), 33 );
  }

  render() {
    const { props: { maxDate, minDate, userMinDate, userMaxDate, onChange }, state: { max, userMin, userMax, play } } = this;

    const displayMin = ( userMinDate || minDate ) ? ( userMinDate || minDate ).toISOString().substring(0, 10) : '';
    const displayMax = ( userMaxDate || maxDate ) ? ( userMaxDate || maxDate ).toISOString().substring(0, 10) : '';

    const sliderProps = {
      disabled: this.state.play,
      min: 0,
      max: max,
      step: 1,
      range: true,
      onChange: v => onChange( [ v[ 0 ], max - v[ 1 ] ] ),
      pushable: 1
    };

    if ( ( userMinDate || userMaxDate ) && !play ) {
      sliderProps.defaultValue = [ userMin, userMax ];
    } else {
      sliderProps.value = [ userMin, userMax ];
    }

    return (
      <div className='idahomap-slider'>
        <div className={'idahomap-slider-title'}>Set a time range:</div>
        <div className={'idahomap-slider-bar'}>
          <ReactSlider { ...sliderProps } />
        </div>
        <div className={'row idahomap-slider-key'}>
          <div className={'col-xs-6'}>Start: { displayMin }</div>
          <div className={'col-xs-6 text-right'}>End: { displayMax }</div>
        </div>
        <button onClick={ ( event ) => this.togglePlay( event ) } className='btn btn-primary btn-xs' style={{ marginTop: '10px' }}>
          <i className={ !play ? 'fa fa-play' : 'fa fa-pause' }></i>
        </button>
      </div>
    );
  }
}
