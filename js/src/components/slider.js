import React from 'react';

require('rc-slider/assets/index.css');
import ReactSlider from 'rc-slider';


function diffDays( max, min ) {
  return Math.round( Math.abs( ( max.getTime() - min.getTime() ) / ( 24*60*60*1000 ) ) );
}

export default function Slider( props ) {
  const { maxDate, minDate, userMinDate, userMaxDate, onChange } = props;

  const max = diffDays( new Date( maxDate ), new Date( minDate ) );

  const userMin = userMinDate && userMinDate !== minDate ? diffDays( new Date(userMinDate), new Date(minDate)): 0;
  const userMax = userMaxDate ? max - diffDays( new Date( maxDate ), new Date( userMaxDate ) ) : max;

  const displayMin = new Date( userMinDate || minDate ).toISOString().substring(0, 10);
  const displayMax = new Date( userMaxDate || maxDate ).toISOString().substring(0, 10);

  const sliderProps = {
    min: 0,
    max: max,
    step: 1,
    range: true,
    onChange: ( values ) => {
      onChange( [ values[ 0 ], max - values[ 1 ] ] );
    }
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
