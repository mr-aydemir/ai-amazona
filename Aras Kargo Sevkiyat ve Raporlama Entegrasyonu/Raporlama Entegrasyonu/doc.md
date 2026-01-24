İşte **Aras Kargo-Müşteri Bilgi Sorgulama Servisleri.pdf** dosyasının Markdown (.md) formatına dönüştürülmüş hali. Orijinal belgedeki yapı, teknik detaylar, tablolar ve kod örnekleri korunarak düzenlenmiştir.

---

# ARAS KARGO MÜŞTERİ BİLGİ SORGULAMA SERVİSLERİ

**Doküman Kodu:** -


**Yayın Tarihi:** 30.09.2014 **Revizyon Tarihi:** 31.07.2017 

---

## 1. AMAÇ

Bu dokümanda Aras Kargo A.Ş'nin müşterilerine sunmuş olduğu bilgilendirme hizmetleri listelenmiştir. Müşteriler kargo bilgilerinin takibini dokümanda belirtilen yollarla yapabilirler.

---

## 2. ARAS WEB SERVİSİ İLE YAPILAN BİLGİLENDİRME

### 2.1. Uygulamaya Kayıt Olma

* Uygulamaya kayıt olabilmek için, kurumsal web sitesinden "Entegrasyon" sekmesi altında bulunan "Entegrasyon İşlemleri" butonuna tıklanır ve "XML Servisleri" sekmesi seçilir.


* Canlı ortam bilgileri `esasweb.araskargo.com.tr` adresinde yer alan XML Servisleri sayfasından üye olunarak oluşturulmaktadır.



**Servis Linkleri ve Bilgileri:**

* 
**Test Ortamı Linki:** `https://customerservicestest.araskargo.com.tr/ArasCargoIntegrationService.svc` 


* **Username:** neodyum
* **Password:** nd2580
* **CustomerCode:** 1932448851342 




* **Canlı Ortam Linki:** `https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc` 



### 2.2. Uygulamaya Giriş

Bilgilendirme servisleri aşağıdaki metotlardan oluşmaktadır:

1. **GetQueryDS:** Kargo bilgilerini "DataSet" olarak döndürür.


2. **GetQueryXML:** Kargo bilgilerini "XML" formatında string olarak döndürür.


3. **GetQueryJSON:** Kargo bilgilerini "JSON" formatında string olarak döndürür.



Servisler `loginInfo` ve `queryInfo` olmak üzere XML formatında string yapıdaki 2 parametre ile çalışır.

**LoginInfo Parametre Yapısı:**

```xml
<LoginInfo>
  <UserName>KullanıcıAdı</UserName>
  <Password>Şifre</Password>
  <CustomerCode>MüşteriKodu</CustomerCode>
</LoginInfo>

```



**QueryInfo Parametre Yapısı (Örnek):**

```xml
<QueryInfo>
  <QueryType>1</QueryType>
  <IntegrationCode>123456</IntegrationCode>
</QueryInfo>

```



---

### QueryType Tanımları ve Detayları

Aşağıda `QueryType` parametresine girilecek değerler ve döndürdüğü sonuçlar listelenmiştir.

#### 2.2.1. QueryType = 1

Müşteri referans bilgisine (Müşteri Özel Kodu) göre belirli bir kargonun bilgisini verir.

| Kolon Adı | Açıklama |
| --- | --- |
| MÜŞTERİ ÖZEL KODU | Müşteri Özel Kodudur |
| İRSALİYE NUMARA | Taşıma İrsaliyesinin Seri ve Numarasıdır |
| GÖNDERİCİ | Gönderici Adresi Adıdır |
| ALICI | Alıcı Adresi Adıdır |
| KARGO TAKİP NO | Kargo takip No |
| ÇIKIŞ/VARIŞ ŞUBE | Kargonun verildiği/teslim eden şube adıdır |
| ÇIKIŞ TARİHİ | İrsaliye tarihidir |
| ADET / DESİ | Kargo parça sayısı / Ölçüsü |
| ÖDEME TİPİ | ÜG: Ücreti Göndericiden, ÜA: Ücreti Alıcıdan |
| DURUM KODU | 1:Çıkış Şubesinde, 2:Yolda, 3:Teslimat Şubesinde, 4:Teslimatta, 5:Parçalı Teslimat, 6:Teslim Edildi, 7:Yönlendirildi |
| WORLDWIDE | Yurtdışı ise 1, değilse 0 |



#### 2.2.2. QueryType = 2

Belirli bir tarihe göre gönderilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>`
* **Dönen Bilgiler:** İrsaliye No, Alıcı/Gönderici Adı, Şubeler, Tutar, İade Durumu, Takip No vb..



#### 2.2.3. QueryType = 3

Teslim tarihine göre teslim edilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>` 



#### 2.2.4. QueryType = 4

İrsaliye tarihine göre teslim edilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>` 



#### 2.2.5. QueryType = 5

Henüz teslim edilmemiş, bir nedenle teslimat şubesinde bekleyen kargoların listesini verir.

* **Parametre:** Sadece QueryType yeterlidir. 
* **Önemli Kolonlar:** Devir Açıklama, Devir Nedeni, Devir Kodu.



#### 2.2.6. QueryType = 6

Belirli bir tarihe göre yönlendirilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>` 
* **Önemli Kolonlar:** Yönlendirme Tarihi, Yönlendiren/Yönlendirilen Birim, Yönlendirme Nedeni.



#### 2.2.7. QueryType = 7

İrsaliye tarihine göre Geri Dönüşlü kargo ürünü ile gönderilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>` 
* **Önemli Kolonlar:** Dönüş İrsaliye Numara, Dönüş Teslim Alan, Dönüş Teslim Tarihi.



#### 2.2.8. QueryType = 8

Göndericiye iade edilen kargoların listesini verir.

* **Parametre:** `<Date>Tarih</Date>` 
* **Önemli Kolonlar:** İade Sebebi, Açıklama, Durum.



#### 2.2.9. QueryType = 9

Kargo hareket bilgisini verir.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>` 
* **Önemli Kolonlar:** İşlem Tarihi, Birim, İşlem (Örn: Şubede araç yükleme).



#### 2.2.10. QueryType = 10

Tüm şube ve şube adres bilgilerini verir.

* **Parametre:** Sadece QueryType yeterlidir. 
* **Kolonlar:** Şube Adı, Adresi, İlçe, Telefon, Koordinat, İl/İlçe Kodu.



#### 2.2.11. QueryType = 11

Müşteri referans bilgisine (MÖK) göre belirli bir kargonun detaylı bilgisini verir. Toplu sorgulama için MÖK bilgisi virgül (`,`) ile ayrılarak gönderilebilir.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>` 
* **Ekstra Bilgiler:** Tahsilat Tutarı/Tipi, Vade Tarihi, Ödeme Tutarı/Tarihi.



#### 2.2.12. QueryType = 12

İki tarih aralığına göre (İrsaliye Tarihi) kargoların listesini verir.

* **Parametre:** `<StartDate>Tarih</StartDate>`, `<EndDate>Tarih</EndDate>` 



#### 2.2.13. QueryType = 13

İki tarih aralığına göre (İrsaliye Tarihi) kargo listesini verir. QueryType 12'den farklı olarak **tahsilatlı kargo bilgilerini de içerir**.

* **Parametre:** StartDate, EndDate.



#### 2.2.14. QueryType = 14

Kargo takip bilgisine göre (tracking number), belirli bir kargonun bilgisini verir. Toplu sorgu için virgül ile ayrılır.

* **Parametre:** `<TrackingNumber>No</TrackingNumber>` (veya `<Code>`).



#### 2.2.15. QueryType = 15

Kargo hareket bilgilerini içerir.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>`.



#### 2.2.16. QueryType = 16

İki tarih aralığına göre kargoların **devir** bilgisini verir.

* **Parametre:** StartDate, EndDate.



#### 2.2.17. QueryType = 18

İki tarih aralığına göre kargoların listesini verir.

* **Parametre:** StartDate, EndDate.



#### 2.2.18. QueryType = 19

İki tarih aralığına göre (İrsaliye Tarihi) kargo bilgisini (Devir ve Yönlendirme detaylarıyla) verir.

#### 2.2.19. QueryType = 21

Müşteri parça numarasına göre (son 90 gün) kargo bilgisi verir.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>`.



#### 2.2.20. QueryType = 22

Tracking Number ile çalışır. **Sadece GetQueryDS'de mevcuttur.** Birden fazla dataset döner (Kargo Durumu, Geri Dönüş, Devir, Yönlendirme detayları ayrı tablolarda gelir).

* **Parametre:** `<TrackingNumber>No</TrackingNumber>`.



#### 2.2.21. QueryType = 23

Fatura bilgilerini döner. Normal ve E-Fatura araması yapılabilir.

* **Parametreler:** `<ReportType>1 (E-Fatura) veya 2 (Normal)</ReportType>`, `<InvoiceSerialNumber>SeriNo</InvoiceSerialNumber>`.



#### 2.2.22. QueryType = 24

Barkod ile kargo bilgisi sorgulama (Son 90 gün).

* **Parametre:** `<Barcode>BarkodNo</Barcode>`.



#### 2.2.23. QueryType = 25

Fatura bilgilerini Vade Tarihi/Ödeme Tarihi/Teslim Tarihine göre döner. `DateType` 1, 2 veya 3 seçilebilir.

* **Parametre:** `<DateType>1</DateType>`.



#### 2.2.24. QueryType = 26

MÖK ile çalışır. Sadece `GetQueryDS` ile çalışır. Birden fazla dataset (Kargo, Geri Dönüş, Devir, Yönlendirme) döner.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>`.



#### 2.2.25. QueryType = 30

Sadece **gelen kargoların** sorgulaması yapılır. Tarih, MÖK, Takip No, Barkod veya KTF ile sorgulanabilir. Geriye dönük en fazla 1 aylık sorgu yapılabilir.

* 
**Parametre Örnekleri:** StartDate/EndDate, IntegrationCode, TrackingNumber, Barcode, KtfBarcodeNo.



#### 2.2.26. QueryType = 31

Bugün teslim edilen kargo sayısını döner.

#### 2.2.27. QueryType = 36

Kampanya kodu bilgilerini döner.

* **Parametre:** `<CampaignCode>code</CampaignCode>`.



#### 2.2.28. QueryType = 37

Müşteri özel koduna göre (MÖK) belirli bir kargonun bilgilerini (tahsilat/COD detaylarıyla) döner.

* **Parametre:** `<IntegrationCode>code</IntegrationCode>`.



#### 2.2.29. QueryType = 39

Müşteri özel koduna göre kargo bilgilerini döner. Kod birden fazla ise virgül ile ayrılır.

* **Parametre:** `<IntegrationCode>code1, code2</IntegrationCode>`.



#### 2.2.30. QueryType = 40

Kurumsal müşterilerin kendi anlaşmasını kullandırdığı entegrasyon modeli için takip kodu alma servisidir. `AccountContractID` gerektirir.

#### 2.2.31. QueryType = 41

Kurumsal müşterilere düzenlenen faturaların listesini getirir. Tarih aralığı en fazla 1 ay olabilir.

#### 2.2.32. QueryType = 100

MÖK ile sorgulama yapılır, müşteriye kısıtlı bilgiler gönderilir. Son 90 gün içinde arar.

#### 2.2.33. QueryType = 101

Tarih ve MÖK ile sorgulama yapılır, kısıtlı bilgi döner. Sadece haftalık sorgu yapılabilir.

#### 2.2.34. QueryType = 102

MÖK ile sorgulama yapılır, kısıtlı bilgi döner.

---

### 2.3. Devir Kodları ve Nedenleri

Teslim edilememe durumunda dönen kodlar şunlardır:

| ID | Devir Nedeni | Devir Kodu |
| --- | --- | --- |
| 10 | ADRES YANLIŞ/YETERSİZ | AY |
| 11 | UĞRAMA NOTU BIRAKILDI (1-2) | NT |
| 12 | MOBİL DAĞITIM GÜNÜNDE TESLİMATA ÇIKARILACAK | MD |
| 14 | TATİL DOLAYISIYLA TESLİMAT YAPILAMADI | TL |
| 15 | MÜŞTERİ KARGOSUNU ŞUBEDEN ALACAK | SA |
| 17 | ALICI ADRESİ DAĞITIM ALANI DIŞINDA | AD |
| 18 | TESLİMAT GÜN İÇERİSİNDE YAPILAMADI | TG |
| 20 | ALICI ADRESTE TANINMIYOR | AA |
| 22 | HASARLI/TAZMİNLİK/SORUNLU KARGO | HT |
| 26 | KARGO GÜMRÜKTE | KG |
| 33 | ALICI TAŞIMA ÜCRETİNİ ÖDEMEYİ REDDETTİ | ÜR |
| 34 | ALICI KARGOYU KABUL ETMİYOR | KE |
| 47 | PARÇA SORUNLU/TESLİM EDİLEMEDİ | PS |

---

### 2.4. Örnek Kod (C#)

```csharp
var ArasIntegrationService = new ArasCargoIntegrationService();
string loginInfo = @"<LoginInfo>
   <UserName>username</UserName>
   <Password>password</Password>
   <CustomerCode>customerCode</CustomerCode>
</LoginInfo>";

string queryInfo = @"<QueryInfo>
   <QueryType>queryType</QueryType>
   <Date>Tarih</Date>
</QueryInfo>";

DataSet dataSetResult = ArasIntegrationService.GetQueryDS(loginInfo, queryInfo);
string xmlResult = ArasIntegrationService.GetQueryXML(loginInfo, queryInfo);
string jsonResult = ArasIntegrationService.GetQueryJSON(loginInfo, queryInfo);

```



---

## 3. MAIL İLE YAPILAN BİLGİLENDİRME

Kurumsal web sitesinden "Tanımlamalar" -> "Entegrasyon" -> "Bilgilendirme Hizmeti" sekmesinden tür "MAIL" seçilerek kayıt olunabilir. Teslim Edilememe (Devir), Teslimat vb. seçenekler seçilebilir.

---

## 4. MÜŞTERİ WEB SERVİSİ İLE YAPILAN BİLGİLENDİRME

Müşteri, Aras Kargo'dan gelen verileri karşılamak için bir web servis hazırlar. Aras Kargo bu servise aşağıdaki parametreleri gönderir:

**Gelen Parametreler:**

* IntegrationCode (string)
* CargoStatus (integer)
* ProcessDate (Datetime)
* Description (String)
* UserName / Password

**Dönüş Beklenen Değerler:**

* Result (boolean)
* ErrorDescription (string) 



---

## 5. KURUMSAL WEB RAPORLARI

Kurumsal web sitesi üzerinden "Gönderi Takip" sekmesi altında çeşitli raporlar alınabilir:

1. 
**Gönderilen Kargolar:** Tümü, Ücreti Göndericiden/Alıcıdan, Teslim Edilen, İade Edilen, Tahsilatlı Kargolar gibi alt raporları içerir.


2. 
**Gelen Kargolar:** Müşteriye gelen kargoların listesidir.


3. 
**Gönderi Arama:** İrsaliye No, MÖK, Alıcı Adı veya Kargo Takip No ile detaylı arama yapılır.



---

## 6. KARGO TAKİP LİNKLERİ

Müşteriler kendi sistemlerinde kullanmak üzere kargo takip linki oluşturabilirler.
Web sitesinden "Tanımlamalar" -> "Entegrasyon" -> "Kargo Takip Web Sayfası Üyeliği" adımından kayıt olunur.

**Link Formatı:**
`http://kargotakip.araskargo.com.tr/mainpage.aspx?accountid=[AccountID]&sifre=[Sifre]&alici_kod=[AliciKodu]`


* Not: Linkteki `alici_kod` parametresine ilgili kargonun alıcı kodu dinamik olarak girilmelidir.