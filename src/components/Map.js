import React, { useEffect, useRef, useState } from 'react';
import { 
  Viewer, 
  Entity, 
  GeoJsonDataSource, 
  CameraFlyTo, 
  PointGraphics, 
  EntityDescription,
} from 'resium';
import {
  Cartesian3,
  Color,
  Ion,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  createWorldTerrainAsync,
  Math as CesiumMath,
  buildModuleUrl,
  Rectangle,
  SceneMode,
  VerticalOrigin,
  HeightReference,
  Cartesian2,
  ImageryLayer,
  IonWorldImageryStyle,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import '../styles/Map.css';

// Set the base URL for Cesium's static assets
buildModuleUrl.setBaseUrl('./cesium/');

// Set your Cesium Ion access token here
Ion.defaultAccessToken = process.env.REACT_APP_CESIUM_ION_TOKEN;

const Map = ({ layers, onFeatureSelect }) => {
  const viewerRef = useRef(null);
  const dataSourceRefs = useRef({});
  const handlerRef = useRef(null);
  const [position, setPosition] = useState({ lat: 5.4204, lng: 116.7968 }); // Sabah
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [terrainProvider, setTerrainProvider] = useState(null);
  const [baseLayer, setBaseLayer] = useState(null);

  // Load terrain provider on component mount
  useEffect(() => {
    const loadTerrain = async () => {
      try {
        const terrain = await createWorldTerrainAsync();
        setTerrainProvider(terrain);
      } catch (error) {
        console.error("Failed to load terrain provider:", error);
      }
    };
 
    loadTerrain();
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !viewerRef.current.cesiumElement) return;

    const viewer = viewerRef.current.cesiumElement;
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.add(new ImageryLayer.fromWorldImagery({
      style: IonWorldImageryStyle.ROAD,
    }));
    viewer.baseLayerPicker.container.querySelector('.cesium-baseLayerPicker-selected').src = '/cesium/Widgets/Images/ImageryProviders/bingRoads.png';

    viewer.entities.add({
      position: Cartesian3.fromDegrees(116.7968, 5.4204),
      billboard: {
        image: './pin.png',
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(15, 0),
        scale: 0.2,
      },
      name: 'Sabah',
      show: true, 
    });
  }, [terrainProvider]);

  // Set up click handler for feature selection
  useEffect(() => {
    if (!viewerRef.current || !viewerRef.current.cesiumElement) return;

    const viewer = viewerRef.current.cesiumElement;

    // Clean up previous handler if it exists
    if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;
    }

    // Create new handler
    handlerRef.current = new ScreenSpaceEventHandler(viewer.canvas);
    handlerRef.current.setInputAction((click) => {
      const pickedFeature = viewer.scene.pick(click.position);
      if (defined(pickedFeature) && pickedFeature.id && pickedFeature.id.properties) {
        const properties = {};
        
        // Extract properties from the Cesium entity
        for (const key in pickedFeature.id.properties) {
          if (pickedFeature.id.properties.hasOwnProperty(key) && 
              pickedFeature.id.properties[key] && 
              typeof pickedFeature.id.properties[key].getValue === 'function') {
            properties[key] = pickedFeature.id.properties[key].getValue();
          }
        }
        
        if (onFeatureSelect) {
          onFeatureSelect({
            properties,
            id: pickedFeature.id.id
          });
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [onFeatureSelect, viewerRef.current]);

  // Process layers when they change
useEffect(() => {
  console.log("Layers updated:", layers);
  
  if (!viewerRef.current || !viewerRef.current.cesiumElement) return;
  
  const viewer = viewerRef.current.cesiumElement;
  
  // Clean up existing data sources
  Object.values(dataSourceRefs.current).forEach(ds => {
    if (ds && viewer) {
      viewer.dataSources.remove(ds);
    }
  });
  
  dataSourceRefs.current = {};
  
  // Process zoom information
  const processZoomInfo = () => {
    // Look for layer with direct zoomTo property first (new format)
    const layerWithDirectZoom = layers.find(layer => layer && layer.zoomTo);
    
    if (layerWithDirectZoom && layerWithDirectZoom.zoomTo) {
      console.log("Found layer with direct zoomTo:", layerWithDirectZoom.zoomTo);
      
      // If it has center and zoom
      if (layerWithDirectZoom.zoomTo.center && typeof layerWithDirectZoom.zoomTo.zoom === 'number') {
        const height = 5000 / Math.pow(2, layerWithDirectZoom.zoomTo.zoom - 10);
        setFlyToPosition({
          destination: Cartesian3.fromDegrees(
            layerWithDirectZoom.zoomTo.center[0], 
            layerWithDirectZoom.zoomTo.center[1], 
            height
          ),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-45),
            roll: 0.0
          }
        });
        return true;
      }
    }
    return false;
  };
  
  // If no direct zoom found, process geojson layers to find bounds
  const zoomToGeojsonBounds = () => {
    const geojsonLayers = layers.filter(layer => 
      layer && 
      layer.type === 'geojson' && 
      layer.data && 
      layer.data.features && 
      layer.data.features.length
    );
    
    if (geojsonLayers.length) {
      for (const layer of geojsonLayers) {
        let west = 180, south = 90, east = -180, north = -90;
        let hasCoordinates = false;
        
        layer.data.features.forEach(feature => {
          if (feature.geometry.type === 'Point') {
            hasCoordinates = true;
            const [lng, lat] = feature.geometry.coordinates;
            west = Math.min(west, lng);
            south = Math.min(south, lat);
            east = Math.max(east, lng);
            north = Math.max(north, lat);
          } else if (feature.geometry.type === 'Polygon') {
            hasCoordinates = true;
            feature.geometry.coordinates[0].forEach(coord => {
              const [lng, lat] = coord;
              west = Math.min(west, lng);
              south = Math.min(south, lat);
              east = Math.max(east, lng);
              north = Math.max(north, lat);
            });
          }
        });
        
        if (hasCoordinates) {
          console.log("Found bounds from GeoJSON:", west, south, east, north);
          const centerLng = (west + east) / 2;
          const centerLat = (south + north) / 2;
          
          // Add a little padding around the bounds
          const padding = 0.02;  // about 2km
          west -= padding;
          east += padding;
          south -= padding;
          north += padding;
          
          setFlyToPosition({
            destination: Cartesian3.fromDegrees(centerLng, centerLat, 10000),
            orientation: {
              heading: CesiumMath.toRadians(0),
              pitch: CesiumMath.toRadians(-45),
              roll: 0.0
            }
          });
          
          return true;
        }
      }
    }
    return false;
  };
  
  // Process in order: direct zoom, geojson bounds
  const hasZoom = processZoomInfo() || zoomToGeojsonBounds();
  console.log("Has zoom info:", hasZoom);
  
}, [layers]);

// Modify the GeoJsonDataSource rendering:
{/* Render GeoJSON/Polygon layers */}
{layers.filter(layer => layer && (layer.type === 'geojson' || layer.type === 'polygon')).map((layer, index) => {
  console.log("Rendering GeoJSON layer:", layer);
  return (
    <GeoJsonDataSource
      key={`geojson-${index}-${Date.now()}`} // Force re-render
      data={layer.data}
      stroke={Color.fromCssColorString(layer.style?.color || '#3388ff')}
      strokeWidth={layer.style?.weight || 2}
      fill={Color.fromCssColorString(layer.style?.fillColor || '#3388ff').withAlpha(layer.style?.fillOpacity || 0.3)}
      clampToGround={true}
      name={layer.name || `Layer ${index + 1}`}
      onLoad={dataSource => {
        console.log("GeoJSON layer loaded:", dataSource);
        dataSourceRefs.current[`layer-${index}`] = dataSource;
        
        // Add this to debug entities
        if (dataSource.entities && dataSource.entities.values.length > 0) {
          console.log("Entities in datasource:", dataSource.entities.values.length);
        }
      }}
    />
  );
})}

  return (
    <div className="map-container">
      {terrainProvider && (
        <Viewer 
          ref={viewerRef} 
          full
          terrainProvider={terrainProvider}
          animation={false}
          timeline={false}
          // baseLayer={baseLayer}
          baseLayerPicker={true}
          navigationHelpButton={false}
          homeButton={true}
          geocoder={false}
          sceneModePicker={true}
          sceneMode={SceneMode.SCENE2D}
          selectionIndicator={false}
          infoBox={true}
        >
          {/* Initial camera position */}
          <CameraFlyTo 
            destination={Cartesian3.fromDegrees(position.lng, position.lat, 1000000)}
            orientation={{
              heading: CesiumMath.toRadians(0),
              pitch: CesiumMath.toRadians(-45),
              roll: 0.0
            }}
            once={true}
          />

          {/* If we need to fly to a specific position */}
          {flyToPosition && (
            <CameraFlyTo 
              key={`flyto-${JSON.stringify(flyToPosition)}`} // Force re-render when position changes
              destination={flyToPosition.destination}
              orientation={flyToPosition.orientation}
            />
          )}

          {/* Render GeoJSON/Polygon layers */}
          {layers.filter(layer => layer && (layer.type === 'geojson' || layer.type === 'polygon')).map((layer, index) => (
            <GeoJsonDataSource
              key={`geojson-${index}-${Date.now()}`} // Force re-render
              data={layer.data}
              stroke={Color.fromCssColorString(layer.style?.color || '#3388ff')}
              strokeWidth={layer.style?.weight || 2}
              fill={Color.fromCssColorString(layer.style?.fillColor || '#3388ff').withAlpha(layer.style?.fillOpacity || 0.3)}
              clampToGround={true}
              name={layer.name || `Layer ${index + 1}`}
              onLoad={dataSource => {
                dataSourceRefs.current[`layer-${index}`] = dataSource;
                
                // If this is a newly loaded data source and we don't have a flyToPosition yet,
                // try to derive one from the data source's entities
                if (!flyToPosition && dataSource && dataSource.entities && dataSource.entities.values.length > 0) {
                  const viewer = viewerRef.current.cesiumElement;
                  viewer.flyTo(dataSource);
                }
              }}
            />
          ))}

          {/* Render Marker layers */}
          {layers.filter(layer => layer && layer.type === 'marker').map((layer, index) => (
            <Entity
              key={`marker-${index}`}
              position={Cartesian3.fromDegrees(layer.lng, layer.lat)}
              name={layer.name || `Marker ${index + 1}`}
            >
              <PointGraphics
                pixelSize={10}
                color={Color.RED}
                outlineColor={Color.WHITE}
                outlineWidth={2}
              />
              {layer.popup && (
                <EntityDescription>
                  <div dangerouslySetInnerHTML={{ __html: layer.popup }} />
                </EntityDescription>
              )}
            </Entity>
          ))}

          {/* Render Heatmap layers (approximation with points) */}
          {layers.filter(layer => layer && layer.type === 'heatmap').map((layer, index) => 
            layer.points.map((point, pointIndex) => (
              <Entity
                key={`heatmap-${index}-point-${pointIndex}`}
                position={Cartesian3.fromDegrees(point[1], point[0])}
              >
                <PointGraphics
                  pixelSize={point[2] ? Math.min(point[2] / 5, 20) : 10}
                  color={Color.RED.withAlpha(0.7)}
                  outlineColor={Color.WHITE}
                  outlineWidth={1}
                />
              </Entity>
            ))
          )}
        </Viewer>
      )}
    </div>
  );
};

export default Map;