import React from 'react';

require('rc-slider/assets/index.css');
import ReactSlider from 'rc-slider';


function diffDays( max, min ) {
  return Math.round( Math.abs( ( max.getTime() - min.getTime() ) / ( 24*60*60*1000 ) ) );
}

export default function Slider( props ) {
  const max = diffDays( new Date(props.maxDate), new Date(props.minDate) );

  const userMin = props.userMinDate && props.userMinDate !== props.minDate ? diffDays(props.userMinDate, props.minDate): 0;
  const userMax = props.userMaxDate ? max - diffDays( new Date(props.maxDate), new Date(props.userMaxDate) ) : max;

  const displayMin = new Date( props.userMinDate || props.minDate ).toISOString().substring(0, 10);
  const displayMax = new Date( props.userMaxDate || props.maxDate ).toISOString().substring(0, 10);

  return (
    <div style={{ height: '75px', maxWidth: props.width }}>
      <span className={ 'pull-left' }>{ displayMin }</span>
      <span className={ 'pull-right' }>{ displayMax }</span>
      <ReactSlider min={ 0 } max={ max } step={ 1 } range={ true } defaultValue={[0, max]} value={[userMin, userMax]} onChange={ props.onChange } range />
    </div>
  );
}
