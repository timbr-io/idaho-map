import React from 'react';

require('rc-slider/assets/index.css');
import ReactSlider from 'rc-slider';


function diffDays( max, min ) {
  return Math.round( Math.abs( ( max.getTime() - min.getTime() ) / ( 24*60*60*1000 ) ) );
}

export default function Slider( props ) {
  const { maxDate, minDate, userMinDate, userMaxDate } = props;
  const max = diffDays( new Date( maxDate ), new Date( minDate ) );

  const userMin = userMinDate && userMinDate !== minDate ? diffDays(userMinDate, minDate): 0;
  const userMax = userMaxDate ? max - diffDays( new Date( maxDate ), new Date( userMaxDate ) ) : max;

  const displayMin = new Date( userMinDate || minDate ).toISOString().substring(0, 10);
  const displayMax = new Date( userMaxDate || maxDate ).toISOString().substring(0, 10);

  return (
    <div style={{ height: '75px' }}>
      <span className={ 'pull-left' }>{ displayMin }</span>
      <span className={ 'pull-right' }>{ displayMax }</span>
      <ReactSlider min={ 0 } max={ max } step={ 1 } range={ true } defaultValue={[0, max]} value={[userMin, userMax]} onChange={ props.onChange } range />
    </div>
  );
}
