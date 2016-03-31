Ext.define('PVE.node.Summary', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pveNodeSummary',

    scrollable: true,
    bodyStyle: 'padding:10px',
    defaults: {
	width: 800,
	style: { 'padding-top': '10px' }
    },

    showVersions: function() {
	var me = this;

	// Note: we use simply text/html here, because ExtJS grid has problems
	// with cut&paste

	var nodename = me.pveSelNode.data.node;

	var view = Ext.createWidget('component', {
	    autoScroll: true,
	    style: {
		'background-color': 'white',
		'white-space': 'pre',
		'font-family': 'monospace',
		padding: '5px'
	    }
	});

	var win = Ext.create('Ext.window.Window', {
	    title: gettext('Package versions'),
	    width: 600,
	    height: 400,
	    layout: 'fit',
	    modal: true,
	    items: [ view ] 
	});

	PVE.Utils.API2Request({
	    waitMsgTarget: me,
	    url: "/nodes/" + nodename + "/apt/versions",
	    method: 'GET',
	    failure: function(response, opts) {
		win.close();
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    },
	    success: function(response, opts) {
		win.show();
		var text = '';

		Ext.Array.each(response.result.data, function(rec) {
		    var version = "not correctly installed";
		    var pkg = rec.Package;
		    if (rec.OldVersion && rec.CurrentState === 'Installed') {
			version = rec.OldVersion;
		    }
		    if (rec.RunningKernel) {
			text += pkg + ': ' + version + ' (running kernel: ' +
			    rec.RunningKernel + ')\n'; 
		    } else if (rec.ManagerVersion) {
			text += pkg + ': ' + version + ' (running version: ' +
			    rec.ManagerVersion + ')\n'; 
		    } else {
			text += pkg + ': ' + version + '\n'; 
		    }
		});

		view.update(Ext.htmlEncode(text));
	    }
	});
    },

    initComponent: function() {
        var me = this;

	var nodename = me.pveSelNode.data.node;
	if (!nodename) {
	    throw "no node name specified";
	}

	if (!me.statusStore) {
	    throw "no status storage specified";
	}

	var rstore = me.statusStore;

	var statusview = Ext.create('PVE.node.StatusView', {
	    title: gettext('Status'),
	    pveSelNode: me.pveSelNode,
	    style: { 'padding-top': '0px' },
	    rstore: rstore
	});

	var version_btn = new Ext.Button({
	    text: gettext('Package versions'),
	    handler: function(){
		PVE.Utils.checked_command(function() { d675f09dme.showVersions(); });
	    }
	});

	var rrdstore = Ext.create('PVE.data.RRDStore', {
	    rrdurl: "/api2/json/nodes/" + nodename + "/rrddata",
	});

	Ext.apply(me, {
	    tbar: [version_btn, '->', { xtype: 'pveRRDTypeSelector' } ],
	    plugins: {
		ptype: 'lazyitems',
		items: [
		    statusview,
		    {
			xtype: 'pveRRDChart',
			title: gettext('CPU usage'),
			fields: ['cpu','iowait'],
			fieldTitles: [gettext('CPU usage'), gettext('IO delay')],
			store: rrdstore
		    },
		    {
			xtype: 'pveRRDChart',
			title: gettext('Server load'),
			fields: ['loadavg'],
			fieldTitles: [gettext('Load average')],
			store: rrdstore
		    },
		    {
			xtype: 'pveRRDChart',
			title: gettext('Memory usage'),
			fields: ['memtotal','memused'],
			fieldTitles: [gettext('Total'), gettext('RAM usage')],
			store: rrdstore
		    },
		    {
			xtype: 'pveRRDChart',
			title: gettext('Network traffic'),
			fields: ['netin','netout'],
			store: rrdstore
		    },
		],
	    },
	    listeners: {
		activate: function() { rstore.startUpdate(); rrdstore.startUpdate(); },
		hide: function() { rstore.stopUpdate(); rrdstore.stopUpdate(); },
		destroy: function() { rstore.stopUpdate(); rrdstore.stopUpdate(); },
	    }
	});

	me.callParent();
    }
});
