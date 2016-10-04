import React from 'react';
import autobind from 'autobind-decorator';

@autobind
export default class List extends React.Component {

  contructor( props ) {
    super( props );
    this.state = {
      list: []
    };
  }

  onChange( item ) {
    const list = new Set( this.state.list );
    let newList;

    if ( list.has( item ) ) {
      newList = list.delete( item );
    } else {
      newList = list.add( item );
    }

    this.setState( list: [ ...newList ] );
  }

  render() {

    return (
      <ul>
        { this.state.list.map( ( item, index ) => (
          <li key={ 'li-' + index }>{/* whatever list info we want to display here */}</li>
        ) ) }
      </ul>
    );
  }
}
