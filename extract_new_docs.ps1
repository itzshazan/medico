Add-Type -AssemblyName 'System.IO.Compression.FileSystem'

function Extract-DocxText {
    param(
        [string]$Path,
        [string]$OutPath
    )
    
    Write-Output "Extracting $Path -> $OutPath"
    try {
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
        $out = New-Object System.Collections.Generic.List[string]
        foreach($p in $paragraphs) {
            $texts = $p.SelectNodes('.//w:t', $ns)
            $line = ($texts | ForEach-Object { $_.InnerText }) -join ''
            if($line.Trim()) {
                $out.Add($line)
            }
        }
        [System.IO.File]::WriteAllLines($OutPath, $out)
        Write-Output "Success!"
    } catch {
        Write-Error "Failed to extract: $_"
    }
}

Extract-DocxText -Path 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\clinical_multimodal_ai_workflow_documentation_v2 .docx' -OutPath 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\clinical_multimodal_ai_workflow_documentation_v2.txt'
Extract-DocxText -Path 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\AI-Assisted Clinical Documentation Platform for Doctors.docx' -OutPath 'C:\Users\eshaa\Documents\antigravity\hopeful-hubble\AI_Assisted_Clinical_Platform.txt'
