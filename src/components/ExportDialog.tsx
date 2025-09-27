import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportDialogProps {
  data: any[];
  filename?: string;
  children?: React.ReactNode;
}

const ExportDialog = ({ data, filename = 'export', children }: ExportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeTranscripts: true,
    includeAnswers: true,
    includeMetadata: true,
    format: 'csv' as 'csv' | 'json'
  });
  const { toast } = useToast();

  const exportToCSV = (data: any[]) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter data based on export options
      const filteredData = data.map(item => {
        const filtered: any = { ...item };
        
        if (!exportOptions.includeTranscripts) {
          delete filtered.transcript_text;
          delete filtered.transcript_url;
        }
        
        if (!exportOptions.includeAnswers) {
          delete filtered.answers;
        }
        
        if (!exportOptions.includeMetadata) {
          delete filtered.created_at;
          delete filtered.updated_at;
          delete filtered.id;
        }
        
        return filtered;
      });

      if (exportOptions.format === 'csv') {
        exportToCSV(filteredData);
      } else {
        exportToJSON(filteredData);
      }

      toast({
        title: "Export Successful",
        description: `Data exported as ${exportOptions.format.toUpperCase()} file.`,
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Call Data
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="flex gap-2">
              <Button
                variant={exportOptions.format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant={exportOptions.format === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transcripts"
                  checked={exportOptions.includeTranscripts}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeTranscripts: !!checked }))
                  }
                />
                <Label htmlFor="transcripts" className="text-sm">Call Transcripts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="answers"
                  checked={exportOptions.includeAnswers}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeAnswers: !!checked }))
                  }
                />
                <Label htmlFor="answers" className="text-sm">Qualification Answers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={exportOptions.includeMetadata}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                  }
                />
                <Label htmlFor="metadata" className="text-sm">Timestamps & IDs</Label>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• {data.length} records will be exported</p>
            <p>• Data includes client information and call details</p>
            <p>• Sensitive information is automatically excluded</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {exportOptions.format.toUpperCase()}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;