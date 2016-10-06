import React from 'react';
import autobind from 'autobind-decorator';
import classnames from 'classnames';

export default function List( props ) {
    const { chips, processing, processChips, select, selectedDates } = props;
    const dates = Object.keys(chips); 

    const btnClasses = classnames('btn btn-primary', { 'disabled': !selectedDates.length } );

    return (
      <div>
        { dates.length > 0 &&
            <div className={'idahomap-list'}>
              <h3>Select Dates:</h3>
              <ul>
                { dates.map( ( date, i ) => {
                  const item = chips[ date ]; 
                  if ( item ) {
                    return (
                      <li className={ classnames('', { 'selected': ~selectedDates.indexOf( date ) } ) } key={ 'li-' + i } onClick={ () => select( date ) } >
                        <span>{ date } <span className={'meta'}>({item.length} chips)</span></span>
                      </li>
                    );
                  }
                } ) }
              </ul>
            <div className={ btnClasses } onClick={ () => processChips( chips ) }>Process</div>
            { processing && processing.status === "processing" &&
              <div className={'idahomap-progress'}>
                { processing.text && <span>{processing.text}</span> }
                <div className={'progress'}>
                  <div className={'progress-bar'} style={{ width: processing.percent+'%' }} />
                </div>
              </div>
            }
          </div>
        }
      </div>
    );
}
