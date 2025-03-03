import React, { useEffect, useRef, useState } from 'react';
import { 
  Viewer, 
  Entity, 
  GeoJsonDataSource, 
  CameraFlyTo, 
  PointGraphics, 
  EntityDescription
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
  buildModuleUrl
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
  const [position, setPosition] = useState({ lat: 5.9804, lng: 116.0735 }); // Kota Kinabalu, Sabah
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [terrainProvider, setTerrainProvider] = useState(null);

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
    // Clean up existing data sources
    Object.values(dataSourceRefs.current).forEach(ds => {
      if (ds && viewerRef.current && viewerRef.current.cesiumElement) {
        viewerRef.current.cesiumElement.dataSources.remove(ds);
      }
    });
    
    dataSourceRefs.current = {};
    
    // If there are layers with bounds, set up fly to
    const layerWithBounds = layers.find(layer => layer && layer.bounds);
    if (layerWithBounds && layerWithBounds.bounds) {
      // Calculate center of bounds
      const [west, south, east, north] = layerWithBounds.bounds;
      const centerLng = (west + east) / 2;
      const centerLat = (south + north) / 2;
      
      // Set flyTo position
      setFlyToPosition({
        destination: Cartesian3.fromDegrees(centerLng, centerLat, 10000),
        orientation: {
          heading: CesiumMath.toRadians(0),
          pitch: CesiumMath.toRadians(-45),
          roll: 0.0
        }
      });
    }
  }, [layers]);

  return (
    <div className="map-container">
      {terrainProvider && (
        <Viewer 
          ref={viewerRef} 
          full
          terrainProvider={terrainProvider}
          animation={false}
          timeline={false}
          baseLayerPicker={true}
          navigationHelpButton={false}
          homeButton={true}
          geocoder={false}
          sceneModePicker={true}
          selectionIndicator={false}
          infoBox={true}
        >
          {/* Initial camera position */}
          <CameraFlyTo 
            destination={Cartesian3.fromDegrees(position.lng, position.lat, 10000)}
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
              destination={flyToPosition.destination}
              orientation={flyToPosition.orientation}
            />
          )}

          {/* Render GeoJSON/Polygon layers */}
          {layers.filter(layer => layer && (layer.type === 'geojson' || layer.type === 'polygon')).map((layer, index) => (
            <GeoJsonDataSource
              key={`geojson-${index}`}
              data={layer.data}
              stroke={Color.fromCssColorString(layer.style?.color || '#3388ff')}
              strokeWidth={layer.style?.weight || 2}
              fill={Color.fromCssColorString(layer.style?.fillColor || '#3388ff').withAlpha(layer.style?.fillOpacity || 0.3)}
              clampToGround={true}
              name={layer.name || `Layer ${index + 1}`}
              onLoad={dataSource => {
                dataSourceRefs.current[`layer-${index}`] = dataSource;
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