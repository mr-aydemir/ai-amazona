import pandas as pd
import re
import os

# --- Configuration ---
trendyol_file = 'Ürünleriniz_27.10.2025-20.23.xlsx' # Input Excel file
trendyol_sheet_name = 'Ürünler' # Sheet name for Trendyol data

hepsiburada_template_file = '3D-Baski-Parcalar.xlsx' # Template Excel file
hepsiburada_sheet_name = '3D Baskı Parçalar' # Sheet name for Hepsiburada template

output_file = 'hepsiburada_urunler_unique_skus.xlsx' # Output Excel file

# --- Functions ---

def generate_variant_group_id(model_kodu):
    """
    Generates a Variant Grup Id based on the Model Kodu.
    Removes common suffixes like '-1', '-2', etc.
    Returns empty string if input is NaN.
    """
    if pd.isna(model_kodu):
        return ''
    base_id = re.sub(r'-\w+$', '', str(model_kodu))
    return base_id if base_id else ''

def make_sku_unique(sku, sku_counts):
    """
    Checks if SKU exists in counts. If yes, increments count and appends suffix.
    Updates the count dictionary.
    Returns the unique SKU.
    """
    original_sku = str(sku).strip() if pd.notna(sku) else ''
    if not original_sku: # Handle empty SKUs if necessary
        return ''

    if original_sku in sku_counts:
        sku_counts[original_sku] += 1
        unique_sku = f"{original_sku}-{sku_counts[original_sku]-1}" # Start suffix from -1
    else:
        sku_counts[original_sku] = 1
        unique_sku = original_sku # First occurrence keeps original SKU

    return unique_sku


def map_data(trendyol_df, hepsiburada_cols):
    """Maps data from Trendyol DataFrame to Hepsiburada format, ensuring unique SKUs."""
    hepsiburada_data = []
    sku_counts = {} # Dictionary to track SKU occurrences

    for index, row in trendyol_df.iterrows():
        # Handle potential multi-line descriptions
        description = str(row.get('Ürün Açıklaması', '')).replace('\n', ' ').replace('\r', '') if pd.notna(row.get('Ürün Açıklaması')) else ''

        # Prepend brand to product name
        brand = str(row.get('Marka', '')).strip() if pd.notna(row.get('Marka')) else ''
        if brand.lower() == 'hivhestın':
            brand = 'Hivhestin'
        product_name_tr = str(row.get('Ürün Adı', '')).strip() if pd.notna(row.get('Ürün Adı')) else ''
        product_name_hb = f"{brand} {product_name_tr}".strip() if brand or product_name_tr else ''

        # Get original Model Kodu (source for SKU)
        original_model_kodu = row.get('Model Kodu')

        # Generate UNIQUE Satıcı Stok Kodu
        satıcı_stok_kodu = make_sku_unique(original_model_kodu, sku_counts)

        # Generate Variant Group ID based on ORIGINAL Model Kodu
        variant_group_id = generate_variant_group_id(original_model_kodu)

        # Create the data dictionary for the Hepsiburada row
        hb_row = {col: '' for col in hepsiburada_cols} # Initialize ALL with empty strings

        hb_row['Ürün Adı'] = product_name_hb
        hb_row['Satıcı Stok Kodu'] = satıcı_stok_kodu # Use the unique SKU
        hb_row['Barkod'] = str(row.get('Barkod', '')).strip() if pd.notna(row.get('Barkod')) else ''
        hb_row['Varyant Grup Id'] = variant_group_id
        hb_row['Ürün Açıklaması'] = description
        hb_row['Marka'] = brand
        desi_val = pd.to_numeric(row.get('Desi'), errors='coerce')
        hb_row['Desi'] = '' if pd.isna(desi_val) else desi_val
        kdv_val = pd.to_numeric(row.get('KDV Oranı'), errors='coerce')
        hb_row['KDV'] = '' if pd.isna(kdv_val) else int(kdv_val)
        hb_row['Garanti Süresi (Ay)'] = 0
        hb_row['Görsel1'] = str(row.get('Görsel 1', '')).strip() if pd.notna(row.get('Görsel 1')) else ''
        hb_row['Görsel2'] = str(row.get('Görsel 2', '')).strip() if pd.notna(row.get('Görsel 2')) else ''
        hb_row['Görsel3'] = str(row.get('Görsel 3', '')).strip() if pd.notna(row.get('Görsel 3')) else ''
        hb_row['Görsel4'] = str(row.get('Görsel 4', '')).strip() if pd.notna(row.get('Görsel 4')) else ''
        hb_row['Görsel5'] = str(row.get('Görsel 5', '')).strip() if pd.notna(row.get('Görsel 5')) else ''
        hb_row['Görsel6'] = str(row.get('Görsel 6', '')).strip() if pd.notna(row.get('Görsel 6')) else ''
        hb_row['Görsel7'] = str(row.get('Görsel 7', '')).strip() if pd.notna(row.get('Görsel 7')) else ''
        hb_row['Görsel8'] = str(row.get('Görsel 8', '')).strip() if pd.notna(row.get('Görsel 8')) else ''
        fiyat_val = pd.to_numeric(row.get("Trendyol'da Satılacak Fiyat (KDV Dahil)"), errors='coerce')
        hb_row['Fiyat'] = '' if pd.isna(fiyat_val) else fiyat_val
        stok_val = pd.to_numeric(row.get('Ürün Stok Adedi'), errors='coerce')
        hb_row['Stok'] = '' if pd.isna(stok_val) else int(stok_val)

        hb_row['Renk'] = str(row.get('Ürün Rengi', '')).strip() if pd.notna(row.get('Ürün Rengi')) else ''
        hb_row['Beden'] = str(row.get('Beden', '')).strip() if pd.notna(row.get('Beden')) else ''
        hb_row['Seçenek'] = str(row.get('Boyut/Ebat', '')).strip() if pd.notna(row.get('Boyut/Ebat')) else ''

        # Add default/inferred values
        if 'pla ' in description.lower() or '(pla)' in description.lower() or 'pla(' in description.lower():
             hb_row['Malzeme'] = 'PLA'
        else:
             hb_row['Malzeme'] = 'PLA'

        kategori = str(row.get('Kategori İsmi', '')).strip() if pd.notna(row.get('Kategori İsmi')) else ''
        if kategori:
            hb_row['Kullanım Amacı'] = kategori

        hepsiburada_data.append(hb_row)

    df_output = pd.DataFrame(hepsiburada_data)
    # Convert potential numeric columns back to object type if they contain empty strings
    for col in ['Desi', 'KDV', 'Fiyat', 'Stok']:
         # Check if the column exists and handle potential errors
         if col in df_output.columns:
            # Convert to string, check for empty string, then convert back to object if needed
            is_object = False
            try:
                if '' in df_output[col].astype(str).unique():
                    is_object = True
            except Exception: # Handle cases where conversion fails (e.g., all values are None)
                pass
            if is_object:
                df_output[col] = df_output[col].astype(object)

    return df_output.fillna('') # Final catch-all for any remaining NaNs

# --- Main Execution ---

# Check if input files exist
if not os.path.exists(trendyol_file):
    print(f"Hata: Trendyol dosyası bulunamadı: {trendyol_file}")
elif not os.path.exists(hepsiburada_template_file):
    print(f"Hata: Hepsiburada şablon dosyası bulunamadı: {hepsiburada_template_file}")
else:
    try:
        # Read Trendyol data from Excel sheet
        excel_file_tr = pd.ExcelFile(trendyol_file)
        if trendyol_sheet_name not in excel_file_tr.sheet_names:
             raise ValueError(f"'{trendyol_sheet_name}' isimli sayfa Trendyol dosyasında bulunamadı.")

        df_tr_check = pd.read_excel(trendyol_file, sheet_name=trendyol_sheet_name, header=None)
        header_row_index_tr = -1
        for i, row in df_tr_check.iterrows():
            if any(col_name in row.astype(str).tolist() for col_name in ['Partner ID', 'Barkod', 'Model Kodu']):
                header_row_index_tr = i
                break
        if header_row_index_tr == -1:
             raise ValueError("Trendyol dosyasında başlık satırı ('Partner ID', 'Barkod' vb.) bulunamadı.")

        trendyol_df = pd.read_excel(trendyol_file, sheet_name=trendyol_sheet_name, header=header_row_index_tr)

        # Drop rows that might be header remnants or fully empty
        trendyol_df = trendyol_df.dropna(subset=['Barkod'])
        trendyol_df = trendyol_df[trendyol_df['Partner ID'].astype(str).str.contains('Partner ID', na=False) == False]
        trendyol_df = trendyol_df.dropna(how='all')


        # Read Hepsiburada template columns from Excel sheet
        excel_file_hb = pd.ExcelFile(hepsiburada_template_file)
        if hepsiburada_sheet_name not in excel_file_hb.sheet_names:
             raise ValueError(f"'{hepsiburada_sheet_name}' isimli sayfa Hepsiburada şablon dosyasında bulunamadı.")

        hb_cols_df = pd.read_excel(hepsiburada_template_file, sheet_name=hepsiburada_sheet_name, header=2, nrows=0)
        hepsiburada_cols = hb_cols_df.columns.tolist()

        # Read the first two header rows from the template
        header_rows_hb = pd.read_excel(hepsiburada_template_file, sheet_name=hepsiburada_sheet_name, header=None, nrows=2).fillna('')


        # Map the data, ensuring unique SKUs
        hepsiburada_df = map_data(trendyol_df, hepsiburada_cols)

        # --- Generate Output Excel ---
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            header_rows_hb.to_excel(writer, sheet_name=hepsiburada_sheet_name, index=False, header=False, startrow=0)
            hepsiburada_df.to_excel(writer, sheet_name=hepsiburada_sheet_name, index=False, header=True, startrow=2)

        print(f"Dönüştürme tamamlandı. Tekrarlanan Satıcı Stok Kodları'na '-1', '-2' vb. eklenmiştir. Dosya '{output_file}' olarak kaydedildi.")
        # Provide file download tag (specific to Google Colab)
        try:
            from google.colab import files
            files.download(output_file)
        except ImportError:
            print(f"'{output_file}' dosyası geçerli dizine kaydedildi. Google Colab ortamında değilseniz manuel olarak alın.")


    except FileNotFoundError as fnf_error:
        print(f"Dosya bulunamadı hatası: {fnf_error}")
    except ValueError as val_error:
        print(f"Değer hatası: {val_error}")
    except Exception as e:
        print(f"Beklenmeyen bir hata oluştu: {e}")
        print("Lütfen dosya yollarının, sayfa adlarının ve formatlarının doğru olduğundan emin olun.")