import React from 'react';
import autobind from 'autobind-decorator';
import classnames from 'classnames';

export default function List( props ) {
    const { chips, processing, processChips, select, selectedDates } = props;
    const dates = Object.keys(chips).sort(); 

    const btnClasses = classnames('btn btn-primary', { 'disabled': !selectedDates.length } );

    return (
      <div>
        { dates.length > 0 &&
            <div className={'idahomap-list'}>
              <div className="pull-right">
                <small className="subtle">Select <a onClick={ props.selectAll }>All</a> / <a onClick={ props.clearSelection }>None</a></small>
              </div>
              <h3>Select the dates to process:</h3>
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
            <div className={ btnClasses } onClick={ () => processChips( chips ) }>Process Images</div>
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
