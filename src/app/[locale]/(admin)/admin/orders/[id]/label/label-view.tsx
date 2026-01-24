'use client'

import React from 'react'
import Barcode from 'react-barcode'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface LabelViewProps {
  order: any
  contactInfo: any
  className?: string
}

export default function LabelView({ order, contactInfo, className = '' }: LabelViewProps) {
  const senderName = contactInfo?.companyName || 'Company Name'
  const senderAddress = contactInfo?.translations?.[0]?.address || 'Sender Address'
  
  const receiverName = order.shippingFullName || order.user.name
  const receiverAddress = order.shippingStreet
  const receiverCity = order.shippingCity
  const receiverTown = order.shippingState
  const receiverPhone = order.shippingPhone

  // Tracking number or Order ID for barcode
  // Tracking number or Order ID for barcode
  const integrationNo = order.id.toUpperCase()
  // User spec: IntegrationNo + Two Digit Package No (01 for single pack 1/1)
  const barcodeValue = `${integrationNo}01`
  
  // Format date
  const date = new Date().toLocaleDateString('tr-TR')

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-wrapper, #print-wrapper * {
            visibility: visible;
          }
          #print-wrapper {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            padding: 10mm; /* A4 Margin */
            background: white; 
            color: black;
            z-index: 9999;
          }
           /* Ensure barcode is black on white */
          #print-wrapper svg, #print-wrapper img {
            max-width: 100%;
          }
        }
      `}</style>
        
      {/* 
        Container for the label content. 
        In preview (modal): Uses bg-card and text-card-foreground for theme compatibility.
        In print: Using wrapper to simulate A4 page.
      */}
      <div id="print-wrapper">
      <div 
        id="printable-label" 
        className="bg-card text-card-foreground p-4 shadow-sm border-2 border-black w-[100mm] h-[100mm] flex flex-col overflow-hidden box-border"
        style={{ width: '100mm', height: '100mm' }} 
      >
        {/* Header / Logo */}
        <div className="w-full flex justify-between items-start border-b-2 border-black pb-2 mb-2 gap-4 shrink-0">
           <div className="font-bold text-xl uppercase tracking-tighter">ARAS KARGO</div>
           <div className="text-xs text-right whitespace-nowrap leading-tight">
             <div>Tarih: {date}</div>
             <div>Desi: 1</div>
             <div>Paket: 1/1</div>
           </div>
        </div>

        {/* Receiver (ALICI) - Prominent */}
        <div className="flex-grow flex flex-col justify-start py-1 space-y-0.5 border-b border-black mb-2 pb-2">
            <div className="text-[10px] text-muted-foreground uppercase mb-0.5">ALICI (RECEIVER)</div>
            <div className="font-bold text-lg leading-tight break-words">{receiverName}</div>
            <div className="text-xs dark:text-gray-300 break-words line-clamp-2 leading-tight">{receiverAddress}</div>
            <div className="font-bold text-sm uppercase mt-1">{receiverTown} / {receiverCity}</div>
            <div className="text-xs">Tel: {receiverPhone}</div>
        </div>

        {/* Sender (GONDERICI) - Smaller */}
        <div className="border-b border-black pb-2 mb-2 shrink-0">
           <div className="text-[10px] text-muted-foreground uppercase">GÖNDERİCİ (SENDER)</div>
           <div className="text-xs font-semibold leading-tight">{senderName}</div>
           <div className="text-[10px] truncate max-w-[90mm] leading-tight">{senderAddress}</div>
        </div>

        {/* Barcode Section */}
        <div className="flex flex-col items-center justify-between space-y-1 shrink-0">
           
           {/* Integration Code Barcode */}
           <div className="w-full flex flex-col items-center">
              <div className="text-[9px] uppercase font-bold text-black mb-0">ENTEGRASYON NO</div>
              <div className="bg-white px-1 w-full flex justify-center">
                  <Barcode 
                    value={integrationNo} 
                    width={1.2} 
                    height={20} 
                    fontSize={10}
                    displayValue={true} 
                    background='#ffffff'
                    lineColor='#000000'
                    marginTop={2}
                    marginBottom={2}
                  />
              </div>
           </div>

           {/* Package Barcode */}
           <div className="w-full flex flex-col items-center border-t border-dashed border-gray-400 pt-1">
             <div className="text-[9px] font-bold text-black mb-0">PAKET BARKOD NO</div>
             <div className="bg-white px-1 w-full flex justify-center">
                 <Barcode 
                   value={barcodeValue} 
                   width={1.4} 
                   height={25} 
                   fontSize={10}
                   displayValue={true} 
                   background='#ffffff'
                   lineColor='#000000'
                   marginTop={2}
                   marginBottom={2}
                 />
             </div>
           </div>
        </div>
        
        {/* Footer info 
        <div className="text-center text-[8px] mt-0.5 text-muted-foreground shrink-0">
            Sipariş No: #{order.id.slice(-8)}
        </div>
        */}
      </div>
      </div>
      
      <div className="mt-4 flex gap-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Yazdır
        </Button>
      </div>
    </div>
  )
}
