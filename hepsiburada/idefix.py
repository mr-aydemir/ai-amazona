import pandas as pd
import os

def excel_verisini_sablonla_birlestir(xlsx_dosya_yolu, sablon_csv_yolu, cikis_dosya_yolu):
    # 1. Kaynak veriyi oku
    # Excel dosyasını okuyoruz (CSV'ye çevrilmiş halini de okuyabiliriz)
    if xlsx_dosya_yolu.endswith('.csv'):
        df_source = pd.read_csv(xlsx_dosya_yolu)
    else:
        # Excel okuması (Genellikle 'Ürünler' sayfasıdır, yoksa ilk sayfayı okur)
        try:
            df_source = pd.read_excel(xlsx_dosya_yolu, sheet_name='Ürünler')
        except:
            df_source = pd.read_excel(xlsx_dosya_yolu)

    # 2. Şablon dosyasını oku (Sütun isimlerini almak için)
    # Şablon noktalı virgül (;) ile ayrılmış görünüyor
    try:
        df_template = pd.read_csv(sablon_csv_yolu, sep=';', encoding='latin1')
    except:
        df_template = pd.read_csv(sablon_csv_yolu, sep=';', encoding='utf-8')

    # Hedef sütun listesini al
    target_columns = df_template.columns.tolist()
    
    # 3. Yeni DataFrame oluştur
    df_output = pd.DataFrame(columns=target_columns)
    
    # 4. Sütun Eşleştirmeleri (Mapping)
    # Sol taraf: Şablondaki Sütun İsmi (Dosyanızdaki bozuk karakterlere göre ayarlandı: örn 'Ürün Ad?')
    # Sağ taraf: Sizin Excel'deki Sütun İsmi
    mapping = {
        'Ürün Ad?': 'Ürün Adı',
        'Barkod': 'Barkod',
        'Kategori': 'Kategori İsmi',
        'Marka': 'Marka',
        'Ürün Aç?klamas?': 'Ürün Açıklaması',
        'Sat?c? Stok Kodu': 'Barkod',       # Stok kodu olarak Barkod kullanıldı
        'Varyant Grup Id': 'Model Kodu',    # Varyant grubu olarak Model Kodu
        'Stok Adedi': 'Ürün Stok Adedi',
        'Idefix Sat?? Fiyat?': "Trendyol'da Satılacak Fiyat (KDV Dahil)",
        'Piyasa Sat?? Fiyat?': 'Piyasa Satış Fiyatı (KDV Dahil)',
        'KDV': 'KDV Oranı',
        'Desi': 'Desi',
        'Renk': 'Ürün Rengi',
        'Boyut/Ebat': 'Beden'
    }
    
    # Eşleşen sütunları doldur
    for target_col, source_col in mapping.items():
        if target_col in df_output.columns and source_col in df_source.columns:
            df_output[target_col] = df_source[source_col]

    # Görselleri aktar (Görsel 1 ... Görsel 8)
    for i in range(1, 9):
        col_name = f'Görsel {i}'
        if col_name in df_output.columns and col_name in df_source.columns:
            df_output[col_name] = df_source[col_name]
            
    # Parti/Lot bilgisi (Varsa)
    if 'Parti/Lot/SKT' in df_output.columns and 'Parti/Lot/SKT Bilgisi' in df_source.columns:
        df_output['Parti/Lot/SKT'] = df_source['Parti/Lot/SKT Bilgisi']

    # 5. Dosyayı Kaydet
    # Türkçe karakterler için utf-8-sig ve ayırıcı olarak noktalı virgül (;) kullanıldı
    df_output.to_csv(cikis_dosya_yolu, sep=';', index=False, encoding='utf-8-sig')
    print(f"Dosya başarıyla oluşturuldu: {cikis_dosya_yolu}")

# Kodun çalıştırılması (Dosya isimlerini kendi dosyalarınıza göre düzenleyebilirsiniz)
source_file = "Ürünleriniz_02.01.2026-23.27.xlsx" # veya .xlsx
template_file = "dekoratif-aksesuarlar-17411-20260102232441(Ürünlerinizi Burada Listeleyin).csv"
output_file = "Idefix_Urun_Listesi_Hazir.csv"

excel_verisini_sablonla_birlestir(source_file, template_file, output_file)