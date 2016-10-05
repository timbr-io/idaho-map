import React from 'react';
import autobind from 'autobind-decorator';

export default function List( props ) {
    const { chips, processing, processChips } = props;
    const dates = Object.keys(chips); 
    return (
      <div>
        { dates.length > 0 &&
            <div className={'idahomap-list'}>
              <h3>Selected Dates & Chips</h3>
              <ul>
                { dates.map( ( date, i ) => {
                  const item = chips[ date ]; 
                  if ( item ) {
                    return (
                      <li key={ 'li-' + i }>
                        <span>{ date } <span className={'meta'}>({item.length} chips)</span></span>
                      </li>
                    );
                  }
                } ) }
              </ul>
            <div className={'btn btn-primary'} onClick={ () => processChips( chips ) }>Process</div>
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
