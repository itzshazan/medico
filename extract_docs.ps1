Add-Type -AssemblyName 'System.IO.Compression.FileSystem'

function Extract-DocxText {
    param([string]$Path)
    
    Write-Output "====== FILE: $Path ======"
    
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    $entry = $zip.GetEntry('word/document.xml')
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = [xml]$reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()
    
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    
    $paragraphs = $xml.SelectNodes('//w:p', $ns)
    foreach($p in $paragraphs) {
        $texts = $p.SelectNodes('.//w:t', $ns)
        $line = ($texts | ForEach-Object { $_.InnerText }) -join ''
        if($line.Trim()) {
            Write-Output $line
        }
    }
    Write-Output ""
}

# Extract Doc 2
Extract-DocxText -Path 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\Doc 2.docx.docx'

# Extract Rules
Extract-DocxText -Path 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\Rules.docx'
