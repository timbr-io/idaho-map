import React from 'react';

require('rc-slider/assets/index.css');
import ReactSlider from 'rc-slider';


function diffDays( max, min ) {
  return Math.round( Math.abs( ( max.getTime() - min.getTime() ) / ( 24*60*60*1000 ) ) );
}

export default function Slider( props ) {
  const { maxDate, minDate, userMinDate, userMaxDate, onChange } = props;

  const max = maxDate && minDate ? diffDays( maxDate, minDate ) : 0;

  const userMin = minDate && userMinDate && userMinDate !== minDate ? diffDays( userMinDate, minDate ) : 0;
  const userMax = maxDate && userMaxDate && userMaxDate !== maxDate ? max - diffDays( maxDate, userMaxDate ) : max;

  const displayMin = ( userMinDate || minDate ) ? ( userMinDate || minDate ).toISOString().substring(0, 10) : '';
  const displayMax = ( userMaxDate || maxDate ) ? ( userMaxDate || maxDate ).toISOString().substring(0, 10) : '';

  const sliderProps = {
    min: 0,
    max: max,
    step: 1,
    range: true,
    onChange: v => onChange( [ v[ 0 ], max - v[ 1 ] ] )
  };

  if ( userMinDate || userMaxDate ) {
    sliderProps.defaultValue = [ userMin, userMax ];
  } else {
    sliderProps.value = [ userMin, userMax ];
  }

  return (
    <div className={'idahomap-slider'}>
      <div className={'idahomap-slider-title'}>Time Range Selection</div>
      <div className={'idahomap-slider-bar'}>
        <ReactSlider { ...sliderProps } />
      </div>
      <div className={'row idahomap-slider-key'}>
        <div className={'col-xs-6'}>Start: { displayMin }</div>
        <div className={'col-xs-6 text-right'}>End: { displayMax }</div>
      </div>
    </div>
  );
}
