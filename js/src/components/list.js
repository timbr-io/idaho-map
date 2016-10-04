import React from 'react';
import autobind from 'autobind-decorator';

@autobind
export default class List extends React.Component {

  constructor( props ) {
    super( props );
    this.state = {
      list: []
    };
  }

  componentWillReceiveProps( nextProps ) {
    if ( nextProps.chips !== this.state.list ) {
      this.setState( { list: nextProps.chips } );
    }
  }

  onChange( item ) {
    const list = new Set( this.state.list );

    if ( list.has( item ) ) {
      list.delete( item );
    } else {
      list.add( item );
    }

    this.setState( { list: [ ...list ] } );
  }

  render() {

    return (
      <div>
        { this.state.list.length > 0 &&
          <ul>
            { this.state.list.map( ( item, index ) => {
              const key = Object.keys( item )[0];
              return (
                <li key={ 'li-' + index }>
                  <span>{ key + '    images: ' + item[ key ].length }</span>
                </li>
              );
            } ) }
          </ul>
        }
      </div>
    );
  }
}
