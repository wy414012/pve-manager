Ext.define('PVE.CephCreateOsd', {
    extend: 'Proxmox.window.Edit',
    xtype: 'pveCephCreateOsd',

    subject: 'Ceph OSD',

    showProgress: true,

    onlineHelp: 'pve_ceph_osds',

    initComponent : function() {
        var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	me.isCreate = true;

        Ext.applyIf(me, {
	    url: "/nodes/" + me.nodename + "/ceph/osd",
	    method: 'POST',
	    items: [
		{
		    xtype: 'inputpanel',
		    column1: [
			{
			    xtype: 'pveDiskSelector',
			    name: 'dev',
			    nodename: me.nodename,
			    diskType: 'unused',
			    fieldLabel: gettext('Disk'),
			    allowBlank: false
			}
		    ],
		    column2: [
			{
			    xtype: 'pveDiskSelector',
			    name: 'db_dev',
			    nodename: me.nodename,
			    diskType: 'journal_disks',
			    fieldLabel: gettext('DB Disk'),
			    value: '',
			    autoSelect: false,
			    allowBlank: true,
			    emptyText: 'use OSD disk',
			    listeners: {
				change: function(field, val) {
				    me.down('field[name=db_size]').setDisabled(!val);
				}
			    }
			},
			{
			    xtype: 'numberfield',
			    name: 'db_size',
			    fieldLabel: gettext('DB size') + ' (GiB)',
			    minValue: 1,
			    maxValue: 128*1024,
			    decimalPrecision: 2,
			    allowBlank: true,
			    disabled: true,
			    emptyText: gettext('Automatic')
			}
		    ],
		    advancedColumn1: [
			{
			    xtype: 'pveDiskSelector',
			    name: 'wal_dev',
			    nodename: me.nodename,
			    diskType: 'journal_disks',
			    fieldLabel: gettext('WAL Disk'),
			    value: '',
			    autoSelect: false,
			    allowBlank: true,
			    emptyText: 'use OSD/DB disk',
			    listeners: {
				change: function(field, val) {
				    me.down('field[name=wal_size]').setDisabled(!val);
				}
			    }
			},
			{
			    xtype: 'numberfield',
			    name: 'wal_size',
			    fieldLabel: gettext('WAL size') + ' (GiB)',
			    minValue: 0.5,
			    maxValue: 128*1024,
			    decimalPrecision: 2,
			    allowBlank: true,
			    disabled: true,
			    emptyText: gettext('Automatic')
			}
		    ]
		}
	    ]
	});

	me.callParent();
    }
});

Ext.define('PVE.CephRemoveOsd', {
    extend: 'Proxmox.window.Edit',
    alias: ['widget.pveCephRemoveOsd'],

    isRemove: true,

    showProgress: true,
    method: 'DELETE',
    items: [
	{
	    xtype: 'proxmoxcheckbox',
	    name: 'cleanup',
	    checked: true,
	    labelWidth: 130,
	    fieldLabel: gettext('Cleanup Disks')
	}
    ],
    initComponent : function() {

        var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}
	if (me.osdid === undefined || me.osdid < 0) {
	    throw "no osdid specified";
	}

	me.isCreate = true;

	me.title = gettext('Destroy') + ': Ceph OSD osd.' + me.osdid.toString();

        Ext.applyIf(me, {
	    url: "/nodes/" + me.nodename + "/ceph/osd/" + me.osdid.toString()
        });

        me.callParent();
    }
});

Ext.define('PVE.node.CephOsdTree', {
    extend: 'Ext.tree.Panel',
    alias: ['widget.pveNodeCephOsdTree'],
    onlineHelp: 'chapter_pveceph',
    stateful: true,
    stateId: 'grid-ceph-osd',
    columns: [
	{
	    xtype: 'treecolumn',
	    text: 'Name',
	    dataIndex: 'name',
	    width: 150
	},
	{
	    text: 'Type',
	    dataIndex: 'type',
	    align: 'right',
	    width: 60
	},
	{
	    text: gettext("Class"),
	    dataIndex: 'device_class',
	    align: 'right',
	    width: 40
	},
	{
	    text: "OSD Type",
	    dataIndex: 'osdtype',
	    align: 'right',
	    width: 40
	},
	{
	    text: "Bluestore Device",
	    dataIndex: 'blfsdev',
	    align: 'right',
	    width: 40,
	    hidden: true
	},
	{
	    text: "DB Device",
	    dataIndex: 'dbdev',
	    align: 'right',
	    width: 40,
	    hidden: true
	},
	{
	    text: "WAL Device",
	    dataIndex: 'waldev',
	    align: 'right',
	    renderer: function(value, metaData, rec) {
		if (!value &&
		    rec.data.osdtype === 'bluestore' &&
		    rec.data.type === 'osd') {
		    return 'N/A';
		}
		return value;
	    },
	    width: 40,
	    hidden: true
	},
	{
	    text: 'Status',
	    dataIndex: 'status',
	    align: 'right',
	    renderer: function(value, metaData, rec) {
		if (!value) {
		    return value;
		}
		var inout = rec.data['in'] ? 'in' : 'out';
		var updownicon = value === 'up' ? 'good fa-arrow-circle-up' :
						  'critical fa-arrow-circle-down';

		var inouticon = rec.data['in'] ? 'good fa-circle' :
						 'warning fa-circle-o';

		var text = value + ' <i class="fa ' + updownicon + '"></i> / ' +
			   inout + ' <i class="fa ' + inouticon + '"></i>';

		return text;
	    },
	    width: 80
	},
	{
	    text: gettext('Version'),
	    dataIndex: 'version',
	    renderer: function(value, metadata, rec) {
		var me = this;
		var icon = "";
		var version = value || "";
		if (value && value != me.maxversion) {
		    icon = PVE.Utils.get_ceph_icon_html('HEALTH_OLD');
		}

		if (!value && rec.data.type == 'host') {
		    version = me.versions[rec.data.name] || Proxmox.Utils.unknownText;
		}

		return icon + version;
	    }
	},
	{
	    text: 'weight',
	    dataIndex: 'crush_weight',
	    align: 'right',
	    renderer: function(value, metaData, rec) {
		if (rec.data.type !== 'osd') {
		    return '';
		}
		return value;
	    },
	    width: 80
	},
	{
	    text: 'reweight',
	    dataIndex: 'reweight',
	    align: 'right',
	    renderer: function(value, metaData, rec) {
		if (rec.data.type !== 'osd') {
		    return '';
		}
		return value;
	    },
	    width: 90
	},
	{
	    header: gettext('Used'),
	    columns: [
		{
		    text: '%',
		    dataIndex: 'percent_used',
		    align: 'right',
		    renderer: function(value, metaData, rec) {
			if (rec.data.type !== 'osd') {
			    return '';
			}
			return Ext.util.Format.number(value, '0.00');
		    },
		    width: 80
		},
		{
		    text: gettext('Total'),
		    dataIndex: 'total_space',
		    align: 'right',
		    renderer: function(value, metaData, rec) {
			if (rec.data.type !== 'osd') {
			    return '';
			}
			return PVE.Utils.render_size(value);
		    },
		    width: 100
		}
	    ]
	},
	{
	    header: gettext('Latency (ms)'),
	    columns: [
		{
		    text: 'Apply',
		    dataIndex: 'apply_latency_ms',
		    align: 'right',
		    renderer: function(value, metaData, rec) {
			if (rec.data.type !== 'osd') {
			    return '';
			}
			return value;
		    },
		    width: 60
		},
		{
		    text: 'Commit',
		    dataIndex: 'commit_latency_ms',
		    align: 'right',
		    renderer: function(value, metaData, rec) {
			if (rec.data.type !== 'osd') {
			    return '';
			}
			return value;
		    },
		    width: 60
		}
	    ]
	}
    ],
    initComponent: function() {
	 /*jslint confusion: true */
        var me = this;

	// we expect noout to be not set by default
	var noout = false;
	me.maxversion = "0";

	var nodename = me.pveSelNode.data.node;
	if (!nodename) {
	    throw "no node name specified";
	}

	var sm = Ext.create('Ext.selection.TreeModel', {});

	var set_button_status; // defined later

	var reload = function() {
	    Proxmox.Utils.API2Request({
                url: "/nodes/" + nodename + "/ceph/osd",
		waitMsgTarget: me,
		method: 'GET',
		failure: function(response, opts) {
		    var msg = response.htmlStatus;
		    PVE.Utils.showCephInstallOrMask(me, msg, me.pveSelNode.data.node,
			function(win){
			    me.mon(win, 'cephInstallWindowClosed', function(){
				reload();
			    });
			}
		    );
		},
		success: function(response, opts) {
		    var data = response.result.data;
		    var selected = me.getSelection();
		    var name;
		    if (selected.length) {
			name = selected[0].data.name;
		    }
		    sm.deselectAll();
		    me.setRootNode(data.root);
		    me.expandAll();
		    if (name) {
			var node = me.getRootNode().findChild('name', name, true);
			if (node) {
			    me.setSelection([node]);
			}
		    }
		    // extract noout flag
		    if (data.flags && data.flags.search(/noout/) !== -1) {
			noout = true;
		    } else {
			noout = false;
		    }

		    me.versions = data.versions;
		    // extract max version
		    Object.values(data.versions || {}).forEach(function(version) {
			if (PVE.Utils.compare_ceph_versions(version, me.maxversion) > 0) {
			    me.maxversion = version;
			}
		    });
		    set_button_status();
		}
	    });
	};

	var osd_cmd = function(cmd) {
	    var rec = sm.getSelection()[0];
	    if (!(rec && (rec.data.id >= 0) && rec.data.host)) {
		return;
	    }
	    Proxmox.Utils.API2Request({
                url: "/nodes/" + rec.data.host + "/ceph/osd/" +
		    rec.data.id + '/' + cmd,
		waitMsgTarget: me,
		method: 'POST',
		success: reload,
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		}
	    });
	};

	var service_cmd = function(cmd) {
	    var rec = sm.getSelection()[0];
	    if (!(rec && rec.data.name && rec.data.host)) {
		return;
	    }
	    Proxmox.Utils.API2Request({
                url: "/nodes/" + rec.data.host + "/ceph/" + cmd,
		params: { service: rec.data.name },
		waitMsgTarget: me,
		method: 'POST',
		success: function(response, options) {
		    var upid = response.result.data;
		    var win = Ext.create('Proxmox.window.TaskProgress', { upid: upid });
		    win.show();
		    me.mon(win, 'close', reload, me);
		},
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		}
	    });
	};

	var create_btn = new Proxmox.button.Button({
	    text: gettext('Create') + ': OSD',
	    handler: function() {
		var rec = sm.getSelection()[0];

		var win = Ext.create('PVE.CephCreateOsd', {
                    nodename: nodename
		});
		win.show();
		me.mon(win, 'close', reload, me);
	    }
	});

	var start_btn = new Ext.Button({
	    text: gettext('Start'),
	    disabled: true,
	    handler: function(){ service_cmd('start'); }
	});

	var stop_btn = new Ext.Button({
	    text: gettext('Stop'),
	    disabled: true,
	    handler: function(){ service_cmd('stop'); }
	});

	var restart_btn = new Ext.Button({
	    text: gettext('Restart'),
	    disabled: true,
	    handler: function(){ service_cmd('restart'); }
	});

	var osd_out_btn = new Ext.Button({
	    text: 'Out',
	    disabled: true,
	    handler: function(){ osd_cmd('out'); }
	});

	var osd_in_btn = new Ext.Button({
	    text: 'In',
	    disabled: true,
	    handler: function(){ osd_cmd('in'); }
	});

	var remove_btn = new Ext.Button({
	    text: gettext('Destroy'),
	    disabled: true,
	    handler: function(){
		var rec = sm.getSelection()[0];
		if (!(rec && (rec.data.id >= 0) && rec.data.host)) {
		    return;
		}

		var win = Ext.create('PVE.CephRemoveOsd', {
                    nodename: rec.data.host,
		    osdid: rec.data.id
		});
		win.show();
		me.mon(win, 'close', reload, me);
	    }
	});

	var noout_btn = new Ext.Button({
	    text: gettext('Set noout'),
	    handler: function() {
		Proxmox.Utils.API2Request({
		    url: "/nodes/" + nodename + "/ceph/flags/noout",
		    waitMsgTarget: me,
		    method: noout ? 'DELETE' : 'POST',
		    failure: function(response, opts) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    },
		    success: reload
		});
	    }
	});

	var osd_label = new Ext.toolbar.TextItem({
	    data: {
		osd: undefined
	    },
	    tpl: [
		'<tpl if="osd">',
		'{osd}:',
		'<tpl else>',
		gettext('No OSD selected'),
		'</tpl>'
	    ]
	});

	set_button_status = function() {
	    var rec = sm.getSelection()[0];
	    noout_btn.setText(noout?gettext('Unset noout'):gettext('Set noout'));

	    if (!rec) {
		start_btn.setDisabled(true);
		stop_btn.setDisabled(true);
		restart_btn.setDisabled(true);
		remove_btn.setDisabled(true);
		osd_out_btn.setDisabled(true);
		osd_in_btn.setDisabled(true);
		return;
	    }

	    var isOsd = (rec.data.host && (rec.data.type === 'osd') && (rec.data.id >= 0));

	    start_btn.setDisabled(!(isOsd && (rec.data.status !== 'up')));
	    stop_btn.setDisabled(!(isOsd && (rec.data.status !== 'down')));
	    restart_btn.setDisabled(!(isOsd && (rec.data.status !== 'down')));
	    remove_btn.setDisabled(!(isOsd && (rec.data.status === 'down')));

	    osd_out_btn.setDisabled(!(isOsd && rec.data['in']));
	    osd_in_btn.setDisabled(!(isOsd && !rec.data['in']));

	    osd_label.update(isOsd?{osd:rec.data.name}:undefined);
	};

	sm.on('selectionchange', set_button_status);

	var reload_btn = new Ext.Button({
	    text: gettext('Reload'),
	    handler: reload
	});

	Ext.apply(me, {
	    tbar: [ create_btn, reload_btn, noout_btn, '->', osd_label, start_btn, stop_btn, restart_btn, osd_out_btn, osd_in_btn, remove_btn ],
	    rootVisible: false,
	    useArrows: true,
	    fields: ['name', 'type', 'status', 'host', 'in', 'id' ,
		     { type: 'number', name: 'reweight' },
		     { type: 'number', name: 'percent_used' },
		     { type: 'integer', name: 'bytes_used' },
		     { type: 'integer', name: 'total_space' },
		     { type: 'integer', name: 'apply_latency_ms' },
		     { type: 'integer', name: 'commit_latency_ms' },
		     { type: 'string', name: 'device_class' },
		     { type: 'string', name: 'osdtype' },
		     { type: 'string', name: 'blfsdev' },
		     { type: 'string', name: 'dbdev' },
		     { type: 'string', name: 'waldev' },
		     { type: 'string', name: 'version', calculate: function(data) {
			 return PVE.Utils.parse_ceph_version(data);
		     } },
		     { type: 'string', name: 'iconCls', calculate: function(data) {
			 var iconCls = 'fa x-fa-tree fa-';
			 switch (data.type) {
			    case 'host':
				 iconCls += 'building';
				 break;
			    case 'osd':
				 iconCls += 'hdd-o';
				 break;
			    case 'root':
				 iconCls += 'server';
				 break;
			    default:
				 return undefined;
			 }
			 return iconCls;
		     } },
		     { type: 'number', name: 'crush_weight' }],
	    selModel: sm,

	    listeners: {
		activate: function() {
		    reload();
		}
	    }
	});

	me.callParent();

	reload();
    }
});
