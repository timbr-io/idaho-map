import React from 'react';
import autobind from 'autobind-decorator';
import classnames from 'classnames';

export default function List( props ) {
    const { chips } = props;
    const btnClasses = classnames( 'btn btn-primary', { 'disabled': !chips.length} );

    return (
      <div>
        { chips.length > 0 &&
          <ul>
            { chips.map( ( item, index ) => {
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
        <div className={ btnClasses } onClick={ () => processChips( props.chips ) }>Process</div>
      </div>
    );
}
