Ext.define('PVE.dc.MetricServerView', {
    extend: 'Ext.grid.Panel',
    alias: ['widget.pveMetricServerView'],

    stateful: true,
    stateId: 'grid-metricserver',

    controller: {
        xclass: 'Ext.app.ViewController',

        render_type: function (value) {
            switch (value) {
                case 'influxdb':
                    return 'InfluxDB';
                case 'graphite':
                    return 'Graphite';
                default:
                    return Proxmox.Utils.unknownText;
            }
        },

        editWindow: function (xtype, id) {
            let me = this;
            Ext.create(`PVE.dc.${xtype}Edit`, {
                serverid: id,
                autoShow: true,
                listeners: {
                    destroy: () => me.reload(),
                },
            });
        },

        addServer: function (button) {
            this.editWindow(button.text);
        },

        editServer: function () {
            let me = this;
            let view = me.getView();
            let selection = view.getSelection();
            if (!selection || selection.length < 1) {
                return;
            }

            let cfg = selection[0].data;

            let xtype = me.render_type(cfg.type);
            me.editWindow(xtype, cfg.id);
        },

        reload: function () {
            this.getView().getStore().load();
        },
    },

    store: {
        autoLoad: true,
        id: 'metricservers',
        proxy: {
            type: 'proxmox',
            url: '/api2/json/cluster/metrics/server',
        },
    },

    columns: [
        {
            text: gettext('Name'),
            flex: 2,
            dataIndex: 'id',
        },
        {
            text: gettext('Type'),
            flex: 1,
            dataIndex: 'type',
            renderer: 'render_type',
        },
        {
            text: gettext('Enabled'),
            dataIndex: 'disable',
            width: 100,
            renderer: Proxmox.Utils.format_neg_boolean,
        },
        {
            text: gettext('Server'),
            width: 200,
            dataIndex: 'server',
        },
        {
            text: gettext('Port'),
            width: 100,
            dataIndex: 'port',
        },
    ],

    tbar: [
        {
            text: gettext('Add'),
            menu: [
                {
                    text: 'Graphite',
                    iconCls: 'fa fa-fw fa-bar-chart',
                    handler: 'addServer',
                },
                {
                    text: 'InfluxDB',
                    iconCls: 'fa fa-fw fa-bar-chart',
                    handler: 'addServer',
                },
            ],
        },
        {
            text: gettext('Edit'),
            xtype: 'proxmoxButton',
            handler: 'editServer',
            disabled: true,
        },
        {
            xtype: 'proxmoxStdRemoveButton',
            baseurl: `/api2/extjs/cluster/metrics/server`,
            callback: 'reload',
        },
    ],

    listeners: {
        itemdblclick: 'editServer',
    },

    initComponent: function () {
        var me = this;

        me.callParent();

        Proxmox.Utils.monStoreErrors(me, me.getStore());
    },
});

Ext.define('PVE.dc.MetricServerBaseEdit', {
    extend: 'Proxmox.window.Edit',
    mixins: ['Proxmox.Mixin.CBind'],

    cbindData: function () {
        let me = this;
        me.isCreate = !me.serverid;
        me.serverid = me.serverid || '';
        me.url = `/api2/extjs/cluster/metrics/server/${me.serverid}`;
        me.method = me.isCreate ? 'POST' : 'PUT';
        if (!me.isCreate) {
            me.subject = `${me.subject}: ${me.serverid}`;
        }
        return {};
    },

    submitUrl: function (url, values) {
        return this.isCreate ? `${url}/${values.id}` : url;
    },

    initComponent: function () {
        let me = this;

        me.callParent();

        if (me.serverid) {
            me.load({
                success: function (response, options) {
                    let values = response.result.data;
                    values.enable = !values.disable;
                    me.down('inputpanel').setValues(values);
                },
            });
        }
    },
});

Ext.define('PVE.dc.InfluxDBEdit', {
    extend: 'PVE.dc.MetricServerBaseEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    onlineHelp: 'metric_server_influxdb',

    subject: 'InfluxDB',

    cbindData: function () {
        let me = this;
        me.callParent();
        me.tokenEmptyText = me.isCreate ? '' : gettext('unchanged');
        return {};
    },

    items: [
        {
            xtype: 'inputpanel',
            cbind: {
                isCreate: '{isCreate}',
            },
            onGetValues: function (values) {
                let me = this;
                values.disable = values.enable ? 0 : 1;
                delete values.enable;
                PVE.Utils.delete_if_default(values, 'verify-certificate', '1', me.isCreate);
                return values;
            },

            column1: [
                {
                    xtype: 'hidden',
                    name: 'type',
                    value: 'influxdb',
                    cbind: {
                        submitValue: '{isCreate}',
                    },
                },
                {
                    xtype: 'pmxDisplayEditField',
                    name: 'id',
                    fieldLabel: gettext('Name'),
                    allowBlank: false,
                    cbind: {
                        editable: '{isCreate}',
                        value: '{serverid}',
                    },
                },
                {
                    xtype: 'proxmoxtextfield',
                    name: 'server',
                    fieldLabel: gettext('Server'),
                    allowBlank: false,
                },
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'port',
                    fieldLabel: gettext('Port'),
                    value: 8089,
                    minValue: 1,
                    maximum: 65536,
                    allowBlank: false,
                },
                {
                    xtype: 'proxmoxKVComboBox',
                    name: 'influxdbproto',
                    fieldLabel: gettext('Protocol'),
                    value: '__default__',
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                    comboItems: [
                        ['__default__', 'UDP'],
                        ['http', 'HTTP'],
                        ['https', 'HTTPS'],
                    ],
                    listeners: {
                        change: function (field, value) {
                            let me = this;
                            let view = me.up('inputpanel');
                            let isUdp = value !== 'http' && value !== 'https';
                            view.down('field[name=organization]').setDisabled(isUdp);
                            view.down('field[name=bucket]').setDisabled(isUdp);
                            view.down('field[name=token]').setDisabled(isUdp);
                            view.down('field[name=api-path-prefix]').setDisabled(isUdp);
                            view.down('field[name=mtu]').setDisabled(!isUdp);
                            view.down('field[name=timeout]').setDisabled(isUdp);
                            view.down('field[name=max-body-size]').setDisabled(isUdp);
                            view.down('field[name=verify-certificate]').setDisabled(
                                value !== 'https',
                            );
                        },
                    },
                },
            ],

            column2: [
                {
                    xtype: 'checkbox',
                    name: 'enable',
                    fieldLabel: gettext('Enabled'),
                    inputValue: 1,
                    uncheckedValue: 0,
                    checked: true,
                },
                {
                    xtype: 'proxmoxtextfield',
                    name: 'organization',
                    fieldLabel: gettext('Organization'),
                    emptyText: 'proxmox',
                    disabled: true,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
                {
                    xtype: 'proxmoxtextfield',
                    name: 'bucket',
                    fieldLabel: gettext('Bucket'),
                    emptyText: 'proxmox',
                    disabled: true,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
                {
                    xtype: 'proxmoxtextfield',
                    name: 'token',
                    fieldLabel: gettext('Token'),
                    disabled: true,
                    allowBlank: true,
                    deleteEmpty: false,
                    submitEmpty: false,
                    cbind: {
                        disabled: '{!isCreate}',
                        emptyText: '{tokenEmptyText}',
                    },
                },
            ],

            advancedColumn1: [
                {
                    xtype: 'proxmoxtextfield',
                    name: 'api-path-prefix',
                    fieldLabel: gettext('API Path Prefix'),
                    allowBlank: true,
                    disabled: true,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'timeout',
                    fieldLabel: gettext('Timeout (s)'),
                    disabled: true,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                    minValue: 1,
                    emptyText: 1,
                },
                {
                    xtype: 'proxmoxcheckbox',
                    name: 'verify-certificate',
                    fieldLabel: gettext('Verify Certificate'),
                    value: 1,
                    uncheckedValue: 0,
                    disabled: true,
                },
            ],

            advancedColumn2: [
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'max-body-size',
                    fieldLabel: gettext('Batch Size (b)'),
                    minValue: 1,
                    emptyText: '25000000',
                    submitEmpty: false,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'mtu',
                    fieldLabel: 'MTU',
                    minValue: 1,
                    emptyText: '1500',
                    submitEmpty: false,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
            ],
        },
    ],
});

Ext.define('PVE.dc.GraphiteEdit', {
    extend: 'PVE.dc.MetricServerBaseEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    onlineHelp: 'metric_server_graphite',

    subject: 'Graphite',

    items: [
        {
            xtype: 'inputpanel',

            onGetValues: function (values) {
                values.disable = values.enable ? 0 : 1;
                delete values.enable;
                return values;
            },

            column1: [
                {
                    xtype: 'hidden',
                    name: 'type',
                    value: 'graphite',
                    cbind: {
                        submitValue: '{isCreate}',
                    },
                },
                {
                    xtype: 'pmxDisplayEditField',
                    name: 'id',
                    fieldLabel: gettext('Name'),
                    allowBlank: false,
                    cbind: {
                        editable: '{isCreate}',
                        value: '{serverid}',
                    },
                },
                {
                    xtype: 'proxmoxtextfield',
                    name: 'server',
                    fieldLabel: gettext('Server'),
                    allowBlank: false,
                },
            ],

            column2: [
                {
                    xtype: 'checkbox',
                    name: 'enable',
                    fieldLabel: gettext('Enabled'),
                    inputValue: 1,
                    uncheckedValue: 0,
                    checked: true,
                },
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'port',
                    fieldLabel: gettext('Port'),
                    value: 2003,
                    minimum: 1,
                    maximum: 65536,
                    allowBlank: false,
                },
                {
                    fieldLabel: gettext('Path'),
                    xtype: 'proxmoxtextfield',
                    emptyText: 'proxmox',
                    name: 'path',
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
            ],

            advancedColumn1: [
                {
                    xtype: 'proxmoxKVComboBox',
                    name: 'proto',
                    fieldLabel: gettext('Protocol'),
                    value: '__default__',
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                    comboItems: [
                        ['__default__', 'UDP'],
                        ['tcp', 'TCP'],
                    ],
                    listeners: {
                        change: function (field, value) {
                            let me = this;
                            me.up('inputpanel')
                                .down('field[name=timeout]')
                                .setDisabled(value !== 'tcp');
                            me.up('inputpanel')
                                .down('field[name=mtu]')
                                .setDisabled(value === 'tcp');
                        },
                    },
                },
            ],

            advancedColumn2: [
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'mtu',
                    fieldLabel: 'MTU',
                    minimum: 1,
                    emptyText: '1500',
                    submitEmpty: false,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                },
                {
                    xtype: 'proxmoxintegerfield',
                    name: 'timeout',
                    fieldLabel: gettext('TCP Timeout'),
                    disabled: true,
                    cbind: {
                        deleteEmpty: '{!isCreate}',
                    },
                    minValue: 1,
                    emptyText: 1,
                },
            ],
        },
    ],
});
