import { tileLayer } from 'leaflet';

import { BaseTileLayer } from 'react-leaflet';

export default class CanvasTileLayer extends BaseTileLayer {
  componentWillMount () {
    super.componentWillMount();
    this.leafletElement = tileLayer.canvas( this.props );
    this.leafletElement.drawTile = this.props.drawTile;
  }
}
