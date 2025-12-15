import pandas as pd
import os
import re

# --- Dosya İsimleri ---
trendyol_file = 'Ürünleriniz_28.11.2025-16.43.xlsx' 
output_file = 'Pazarama_Yukleme_Final.xlsx'

# --- Sabit Değerler ---
FIXED_CATEGORY_ID = "ac9982d3-3e82-4efc-86fe-6792bb3931ee"
FIXED_CURRENCY = "TRY"
FIXED_BRAND = "HIVHESTİN"  # İstenilen Marka Değeri

# --- Hedef Sütun Listesi ---
pazarama_columns = [
    "Barkod", "Marka", "Grup Kodu", "Kategori", "Para Birimi", 
    "Ürün Adı", "Ürün Açıklama", "Satış Fiyatı", "İndirimli Satış Fiyatı", 
    "Stok Adedi", "Stok Kodu", "KDV Oranı", 
    "Görsel Linki-1", "Görsel Linki-2", "Görsel Linki-3", "Görsel Linki-4", "Görsel Linki-5",
    "Maksimum Ürün Satış Adedi Kısıtı", "Ürün Bilgi Formu", 
    "renk seçimi", "Renk", "Materyal", "Ölçü", 
    "Ağırlık", "Uzunluk", "Genişlik", "Yükseklik", "Tema"
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

def parse_dimensions(text):
    """
    Boyut/Ebat verisini (Örn: 18x20, 10*15*5) Uzunluk, Genişlik, Yükseklik olarak ayırır.
    """
    if pd.isna(text) or not str(text).strip():
        return "", "", ""
    
    # Metni temizle
    clean = str(text).lower().replace('cm', '').replace(',', '.').strip()
    clean = clean.replace('*', 'x').replace(' ', '')
    
    parts = clean.split('x')
    l, w, h = "", "", ""
    
    try:
        if len(parts) >= 3:
            l, w, h = parts[0], parts[1], parts[2]
        elif len(parts) == 2:
            l, w = parts[0], parts[1]
        elif len(parts) == 1:
            h = parts[0] # Tek boyut ise Yükseklik olarak kabul ediyoruz
    except:
        pass
        
    return l, w, h

# --- Ana İşlem ---

if not os.path.exists(trendyol_file):
    print(f"Hata: '{trendyol_file}' dosyası bulunamadı.")
else:
    try:
        print("Dosya okunuyor ve dönüştürülüyor...")
        
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

        pazarama_data = []
        sku_counts = {}

        for index, row in df_trendyol.iterrows():
            
            # Veri Hazırlığı
            model_kodu = clean_text(row.get('Model Kodu'))
            unique_stok_kodu = get_unique_sku(model_kodu, sku_counts)
            
            # Fiyatlar
            try: satis_fiyati = float(row.get('Piyasa Satış Fiyatı (KDV Dahil)', 0))
            except: satis_fiyati = 0
            
            try: indirimli_fiyat = float(row.get("Trendyol'da Satılacak Fiyat (KDV Dahil)", 0))
            except: indirimli_fiyat = 0
            
            try: stok = int(float(row.get('Ürün Stok Adedi', 0)))
            except: stok = 0
            
            try: kdv = int(float(row.get('KDV Oranı', 20)))
            except: kdv = 20

            # Boyut Ayrıştırma
            raw_boyut = row.get('Boyut/Ebat')
            uzunluk, genislik, yukseklik = parse_dimensions(raw_boyut)

            new_row = {
                "Barkod": clean_text(row.get('Barkod')),
                "Marka": FIXED_BRAND,  # ---> BURASI "HIVHESTİN" OLARAK AYARLANDI
                "Grup Kodu": model_kodu,
                "Kategori": FIXED_CATEGORY_ID,
                "Para Birimi": FIXED_CURRENCY,
                "Ürün Adı": clean_text(row.get('Ürün Adı')),
                "Ürün Açıklama": clean_text(row.get('Ürün Açıklaması')),
                "Satış Fiyatı": satis_fiyati,
                "İndirimli Satış Fiyatı": indirimli_fiyat,
                "Stok Adedi": stok,
                "Stok Kodu": unique_stok_kodu,
                "KDV Oranı": kdv,
                "Görsel Linki-1": clean_text(row.get('Görsel 1')),
                "Görsel Linki-2": clean_text(row.get('Görsel 2')),
                "Görsel Linki-3": clean_text(row.get('Görsel 3')),
                "Görsel Linki-4": clean_text(row.get('Görsel 4')),
                "Görsel Linki-5": clean_text(row.get('Görsel 5')),
                "Maksimum Ürün Satış Adedi Kısıtı": "",
                "Ürün Bilgi Formu": "",
                "renk seçimi": "Çok Renkli", # Sabit Değer
                "Renk": clean_text(row.get('Ürün Rengi')),
                "Materyal": "Plastik",       # Sabit Değer (PLA yerine)
                "Ölçü": "Tekli",             # Sabit Değer
                "Ağırlık": "",
                "Uzunluk": uzunluk,
                "Genişlik": genislik,
                "Yükseklik": yukseklik,
                "Tema": ""
            }
            
            ordered_row = {col: new_row.get(col, "") for col in pazarama_columns}
            pazarama_data.append(ordered_row)

        # Kaydetme
        df_output = pd.DataFrame(pazarama_data)
        df_output = df_output[pazarama_columns]

        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            df_output.to_excel(writer, index=False, sheet_name='Ürün Listesi')

        print(f"Başarılı! '{output_file}' dosyası oluşturuldu.")
        
        try:
            from google.colab import files
            files.download(output_file)
        except ImportError:
            pass

    except Exception as e:
        print(f"Bir hata oluştu: {e}")
        import traceback
        traceback.print_exc()