import pandas as pd
import os
import re

# --- Dosya Ayarları ---
# Girdi Dosyası
trendyol_file = 'Ürünleriniz_05.12.2025-15.08.xlsx' 
# Çıktı Dosyası
output_file = 'N11_Yukleme_Final_V5.xlsx'

# --- Sabit Değerler ---
FIXED_CATEGORY_ID = "1000662"
FIXED_BRAND = "HIVHESTİN"
FIXED_CURRENCY = "TRY"
FIXED_PREP_TIME = "3"
FIXED_DELIVERY_TEMPLATE = "Varsayılan"

# --- N11 Hedef Sütun Listesi ---
n11_columns = [
    "Stok Kodu", "Model Kodu", "Marka", "Kategori", "Para Birimi",
    "Ürün Adı", "Ürün Açıklaması", 
    "Piyasa Satış Fiyatı (KDV Dahil)", "N11 Satış Fiyatı (KDV Dahil)",
    "Stok", "KDV Oranı",
    "Görsel 1", "Görsel 2", "Görsel 3", "Görsel 4", 
    "Görsel 5", "Görsel 6", "Görsel 7", "Görsel 8", 
    "Görsel 9", "Görsel 10", "Görsel 11", "Görsel 12",
    "Hazırlık Süresi", "Teslimat Şablonu İsmi", "Katalog ID", 
    "Barkod (GTIN,EAN)", "Maksimum Satış Adedi",
    "Renk", "Seçenekler"
]

# --- Yardımcı Fonksiyonlar ---

def clean_text(text):
    if pd.isna(text): return ''
    return str(text).strip().replace('\n', ' ').replace('\r', '')

def get_unique_sku(sku, sku_counts):
    sku = str(sku).strip()
    if not sku: return ''
    if sku in sku_counts:
        sku_counts[sku] += 1
        return f"{sku}-{sku_counts[sku]-1}"
    else:
        sku_counts[sku] = 1
        return sku

# --- Ana İşlem ---

if not os.path.exists(trendyol_file):
    print(f"Hata: '{trendyol_file}' dosyası bulunamadı.")
else:
    try:
        print("Trendyol dosyası okunuyor...")
        
        # Başlık satırını bulma
        df_check = pd.read_excel(trendyol_file, sheet_name='Ürünler', header=None)
        header_idx = -1
        for i, row in df_check.iterrows():
            row_str = row.astype(str).tolist()
            if 'Barkod' in row_str and 'Model Kodu' in row_str:
                header_idx = i
                break
        
        if header_idx == -1: raise ValueError("Başlık satırı bulunamadı.")

        df_trendyol = pd.read_excel(trendyol_file, sheet_name='Ürünler', header=header_idx)
        df_trendyol = df_trendyol.dropna(subset=['Barkod'])

        n11_data = []
        sku_counts = {}

        print("Veriler N11 formatına dönüştürülüyor...")

        for index, row in df_trendyol.iterrows():
            
            # Veri Hazırlığı
            raw_model_kodu = clean_text(row.get('Model Kodu'))
            unique_sku = get_unique_sku(raw_model_kodu, sku_counts)
            
            try: piyasa_fiyati = float(row.get('Piyasa Satış Fiyatı (KDV Dahil)', 0))
            except: piyasa_fiyati = 0
            
            try: satis_fiyati = float(row.get("Trendyol'da Satılacak Fiyat (KDV Dahil)", 0))
            except: satis_fiyati = 0
            
            try: stok = int(float(row.get('Ürün Stok Adedi', 0)))
            except: stok = 0
            
            try: kdv = int(float(row.get('KDV Oranı', 20)))
            except: kdv = 20

            # Renk Kontrolü
            renk_degeri = clean_text(row.get('Ürün Rengi'))
            if not renk_degeri: # Eğer renk boşsa
                renk_degeri = "Diğer"

            # Seçenekler
            secenek = clean_text(row.get('Beden'))
            if not secenek:
                secenek = clean_text(row.get('Boyut/Ebat'))

            new_row = {
                "Stok Kodu": unique_sku,
                "Model Kodu": raw_model_kodu,
                "Marka": FIXED_BRAND, 
                "Kategori": FIXED_CATEGORY_ID, 
                "Para Birimi": FIXED_CURRENCY,
                "Ürün Adı": clean_text(row.get('Ürün Adı')),
                "Ürün Açıklaması": clean_text(row.get('Ürün Açıklaması')),
                "Piyasa Satış Fiyatı (KDV Dahil)": piyasa_fiyati,
                "N11 Satış Fiyatı (KDV Dahil)": satis_fiyati,
                "Stok": stok,
                "KDV Oranı": kdv,
                "Görsel 1": clean_text(row.get('Görsel 1')),
                "Görsel 2": clean_text(row.get('Görsel 2')),
                "Görsel 3": clean_text(row.get('Görsel 3')),
                "Görsel 4": clean_text(row.get('Görsel 4')),
                "Görsel 5": clean_text(row.get('Görsel 5')),
                "Görsel 6": clean_text(row.get('Görsel 6')),
                "Görsel 7": clean_text(row.get('Görsel 7')),
                "Görsel 8": clean_text(row.get('Görsel 8')),
                "Görsel 9": "", "Görsel 10": "", "Görsel 11": "", "Görsel 12": "",
                "Hazırlık Süresi": FIXED_PREP_TIME,
                "Teslimat Şablonu İsmi": FIXED_DELIVERY_TEMPLATE,
                "Katalog ID": "",
                "Barkod (GTIN,EAN)": clean_text(row.get('Barkod')),
                "Maksimum Satış Adedi": "",
                "Renk": renk_degeri,  # Güncellenen Renk Değeri
                "Seçenekler": secenek
            }
            
            ordered_row = {col: new_row.get(col, "") for col in n11_columns}
            n11_data.append(ordered_row)

        df_output = pd.DataFrame(n11_data)
        df_output = df_output[n11_columns]

        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            df_output.to_excel(writer, index=False, sheet_name='N11 Ürün Yükleme')

        print(f"İşlem Başarılı! Dosya kaydedildi: {output_file}")
        
        # İndirme (Google Colab için)
        try:
            from google.colab import files
            files.download(output_file)
        except ImportError:
            pass

    except Exception as e:
        print(f"Bir hata oluştu: {e}")
        import traceback
        traceback.print_exc()