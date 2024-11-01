#!/bin/bash

# Diretório de origem e arquivos de saída
SRC_DIR="/mnt/skyforest/2024/B_1_2_3"
FILE_LIST="${SRC_DIR}/file_list.txt"
VRT_FILE="${SRC_DIR}/raster.vrt"
OUTPUT_TIF="${SRC_DIR}/raster"
SRS="EPSG:3006"

# 1. Listar arquivos .jpg e criar um arquivo VRT
find "$SRC_DIR" -name "*.jpg" > "$FILE_LIST"
gdalbuildvrt "$VRT_FILE" -input_file_list "$FILE_LIST"

# 2. Definir opções de compressão e testes para gdal_translate
declare -A COMPRESSIONS=(
  ["NONE"]=""
  ["LZW"]="-co COMPRESS=LZW"
  ["DEFLATE"]="-co COMPRESS=DEFLATE"
  ["DEFLATE_2"]="-co COMPRESS=DEFLATE -co PREDICTOR=2"
  ["DEFLATE_3"]="-co COMPRESS=DEFLATE -co PREDICTOR=3"
  ["ZSTD"]="-co COMPRESS=ZSTD"
  ["ZSTD_2"]="-co COMPRESS=ZSTD -co PREDICTOR=2"
  ["ZSTD_3"]="-co COMPRESS=ZSTD -co PREDICTOR=3"
  ["JPEG"]="-co COMPRESS=JPEG -co PHOTOMETRIC=YCBCR"
  ["PACKBITS"]="-co COMPRESS=PACKBITS"
)

declare -A BIGTIFF_OPTIONS=(
  ["YES"]="-co BIGTIFF=YES"
  ["IF_NEEDED"]="-co BIGTIFF=IF_NEEDED"
)

# 3. Rodar os testes com combinações de compressão e BigTIFF
for COMPRESS in "${!COMPRESSIONS[@]}"; do
  for BIGTIFF in "${!BIGTIFF_OPTIONS[@]}"; do
    OUTPUT_FILE="${OUTPUT_TIF}_${COMPRESS}_${BIGTIFF}"
    echo "Processando $OUTPUT_FILE com compressão $COMPRESS e BigTIFF $BIGTIFF..."

    # Executa o gdal_translate com as combinações de parâmetros para primeira piramidacao
    gdal_translate "$VRT_FILE" "${OUTPUT_FILE}_1.tif" \
      -a_srs $SRS \
      ${COMPRESSIONS[$COMPRESS]} \
      ${BIGTIFF_OPTIONS[$BIGTIFF]} \
      -co "TILED=YES" \
      -a_nodata 0

    # Executa o gdal_translate com as combinações de parâmetros para primeira piramidacao
    gdal_translate "$VRT_FILE" "${OUTPUT_FILE}_2.tif" \
      -a_srs $SRS \
      ${COMPRESSIONS[$COMPRESS]} \
      ${BIGTIFF_OPTIONS[$BIGTIFF]} \
      -co "TILED=YES" \
      -a_nodata 0

    # 4. Gerar pirâmides de resolução
    # a) Pirâmide padrão
    gdaladdo -r average "${OUTPUT_FILE}_1.tif"
    
    # b) Pirâmide com níveis de 2 a 10
    gdaladdo -r average "${OUTPUT_FILE}_2.tif" 2 4 8 16 
  done
done

echo "Todos os testes foram concluídos."
