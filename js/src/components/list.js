import React from 'react';
import autobind from 'autobind-decorator';

export default function List( props ) {
    return (
      <div>
        { props.chips.length > 0 &&
          <ul>
            { props.chips.map( ( item, index ) => {
              const key = Object.keys( item )[0];
              if ( item[ key ] ) {
                return (
                  <li key={ 'li-' + index }>
                    <span>{ key + '    images: ' + item[ key ].length }</span>
                  </li>
                );
              }
            } ) }
          </ul>
        }
        <div className={'btn btn-primary'} onClick={ () => props.processChips( props.chips ) }>Process</div>
      </div>
    );
}
