import React from 'react';
import { Sparklines, SparklinesBars } from 'react-sparklines';
import moment from 'moment';

export default function Histogram( props ) {
  const { minDate, maxDate, footprints } = props;

  let data = [];
  if ( minDate && maxDate ) {
    const days = moment( maxDate ).diff( moment( minDate ), 'days' );
    data = Array.apply( 0, { length: days } ).map( ( d, i ) => {
      const date = moment( minDate ).add( i, 'days' ).startOf( 'day' ).toString();
      return footprints[ date ] || 0.1;
    })
  }

  return ( 
    <div className={ 'histogram' } style={{ maxWidth: '625px', margin: 'auto' }} >
      { data.length >= 3 ? 
        <Sparklines height={10} data={ [ ...data ] } >
          <SparklinesBars style={{ fill: "#00a2de" }} />
        </Sparklines> : ''
      }
    </div>
  );
};
