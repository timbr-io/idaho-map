import React from 'react';

export default class Slider extends React.Component {

  constructor( props ) {
    super( props );
    this.state = {
      value: 0
    };
  }

  onChange( event ) {
    event.preventDefault();
    const value = event.target.value;
    this.setState( { value } );
  }

  render() {

    return (
      <div style={{ maxWidth: this.props.width }}>
        <input type="range" min={ 0 } max={ 100 } value={ this.state.value } onChange={ ( event ) => this.onChange( event ) } />
      </div>
    );
  }
}
