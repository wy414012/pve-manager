Ext.define('PVE.form.CompressionSelector', {
    extend: 'PVE.form.KVComboBox',
    alias: ['widget.pveCompressionSelector'],
    comboItems: [
                ['0', Proxmox.Utils.noneText],
                ['lzo', 'LZO (' + gettext('fast') + ')'],
                ['gzip', 'GZIP (' + gettext('good') + ')']
    ]
});
