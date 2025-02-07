#!/bin/bash

# Loop through each client/year directory in /mnt/
for client_dir in /mnt/*; do
  if [ -d "$client_dir" ]; then
    client_name=$(basename "$client_dir")

    for year_dir in "$client_dir"/*; do
      if [ -d "$year_dir" ]; then
        year=$(basename "$year_dir")

        # Define workspace and layer group names
        WORKSPACE_NAME="${client_name}_${year}"
        LAYER_GROUP_TITLE="$(tr '[:lower:]' '[:upper:]' <<< ${client_name:0:1})${client_name:1} - $year"

        # Create the workspace if it doesn't already exist
        curl --location "$GEOSERVER_URL/rest/workspaces" \
        -u "$GEOSERVER_USERNAME:$GEOSERVER_PASSWORD" \
        --header "Content-Type: application/json" \
        --request POST \
        --data '{
          "workspace": {
            "name": "'"$WORKSPACE_NAME"'"
          }
        }'

        # Initialize an array to store layer names for layer group creation
        layers=()
        styles=()

        # Loop through each subfolder inside /mnt/<client_name>/<year>/
        for folder in "$year_dir"/*; do
          if [ -d "$folder" ]; then
            folder_name=$(basename "$folder")
            tif_path="$folder/raster.tif"
            vrt_path="$folder/raster.vrt"
            layer_title="$LAYER_GROUP_TITLE - $folder_name"

            # Check if folder contains JPG files
            if ls "$folder"/*.jpg 1> /dev/null 2>&1; then
              echo .
              echo "Processing folder: $folder_name in $client_name/$year"

              # Generate the VRT and TIF file
              find "$folder" -name "*.jpg" > "$folder/file_list.txt"
              echo .
              echo "Found $(wc -l < "$folder/file_list.txt") JPG files in $folder_name"
              echo .
              echo "Generating VRT file for $folder_name"
              gdalbuildvrt "$vrt_path" -input_file_list "$folder/file_list.txt"
              echo .
              echo "Generating TIF file for $folder_name"
              gdal_translate "$vrt_path" "$tif_path" -a_srs EPSG:3006 -co COMPRESS=JPEG -co PHOTOMETRIC=YCBCR -co BIGTIFF=YES -co TILED=yes -co NUM_THREADS=8 -a_nodata 0
              echo .
              echo "Adding overviews to TIF file for $folder_name"
              gdaladdo -r average "$tif_path" --config GDAL_NUM_THREADS 8

              # Create the coverage store in GeoServer
              echo .
              echo "Creating coverage store $folder_name in $WORKSPACE_NAME"
              curl --location "$GEOSERVER_URL/rest/workspaces/$WORKSPACE_NAME/coveragestores" \
              -u "$GEOSERVER_USERNAME:$GEOSERVER_PASSWORD" \
              --header "Content-Type: application/json" \
              --request POST \
              --data '{
                "coverageStore": {
                  "name": "'"$folder_name"'",
                  "type": "GeoTIFF",
                  "enabled": true,
                  "workspace": "'"$WORKSPACE_NAME"'",
                  "url": "file:'"$tif_path"'"
                }
              }'

              echo .
              echo "Creating coverage layer $folder_name in $WORKSPACE_NAME"
              # Create the coverage layer in GeoServer
              curl --location "$GEOSERVER_URL/rest/workspaces/$WORKSPACE_NAME/coveragestores/$folder_name/coverages" \
              --header "Content-Type: application/json" \
              -u "$GEOSERVER_USERNAME:$GEOSERVER_PASSWORD" \
              --request POST \
              --data '{
                "coverage": {
                  "name": "'"$folder_name"'",
                  "nativeName": "raster",
                  "title": "'"$layer_title"'",
                  "srs": "EPSG:3006",
                  "enabled": true
                }
              }'

              echo POST $GEOSERVER_URL/rest/workspaces/$WORKSPACE_NAME/coveragestores/$folder_name/coverages '{
                "coverage": {
                  "name": "'"$folder_name"'",
                  "nativeName": "raster",
                  "title": "'"$layer_title"'",
                  "srs": "EPSG:3006",
                  "enabled": true
                }
              }'

              # Add the layer name to the array for the layer group
              layers+=("{ \"name\": \"$WORKSPACE_NAME:$folder_name\"}")
              styles+=("{\"name\": \"raster\"}")
              
              echo .
              echo "Finished processing folder: $folder_name in $client_name/$year"
            else
              echo .
              echo "No JPG files found in folder: $folder_name, skipping..."
            fi
          fi
        done

        echo .
        echo "Creating layer group $LAYER_GROUP_TITLE for $client_name/$year"
        # Create a layer group with all layers under publishables
        layer_list=$(IFS=','; echo "${layers[*]}")
        style_list=$(IFS=','; echo "${styles[*]}")
        curl --location "$GEOSERVER_URL/rest/workspaces/$WORKSPACE_NAME/layergroups" \
        -u "$GEOSERVER_USERNAME:$GEOSERVER_PASSWORD" \
        --header "Content-Type: application/json" \
        --request POST \
        --data '{
          "layerGroup": {
            "name": "'"$WORKSPACE_NAME"'",
            "mode": "SINGLE",
            "title": "'"$LAYER_GROUP_TITLE"'",
            "workspace": {
              "name": "'"$WORKSPACE_NAME"'"
            },
            "layers": {
              "layer": ['"$layer_list"']
            },
            "styles": {
              "style": ['"$style_list"']
            }
          }
        }'

        echo '{
          "layerGroup": {
            "name": "'"$LAYER_GROUP_TITLE"'",
            "mode": "SINGLE",
            "title": "'"$LAYER_GROUP_TITLE"'",
            "workspace": {
              "name": "'"$WORKSPACE_NAME"'"
            },
            "publishables": {
              "published": ['"$layer_list"']
            },
            "styles": {
              "style": [
                {
                  "name": "raster"
                }
              ]
            }
          }
        }'

        echo .
        echo "Layer group $LAYER_GROUP_TITLE created for $client_name/$year"
      fi
    done
  fi
done
