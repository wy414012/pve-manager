Ext.define('PVE.node.StatusView', {
    extend: 'Proxmox.panel.StatusView',
    alias: 'widget.pveNodeStatus',

    height: 700,
    bodyPadding: '15 5 15 5',

    layout: {
    type: 'table',
    columns: 2,
    tableAttrs: {
        style: {
        width: '100%',
        },
    },
    },

    defaults: {
    xtype: 'pmxInfoWidget',
    padding: '0 10 5 10',
    },

    items: [
    {
        itemId: 'cpu',
        iconCls: 'fa fa-fw pmx-itype-icon-processor pmx-icon',
        title: gettext('CPU usage'),
        valueField: 'cpu',
        maxField: 'cpuinfo',
        renderer: Proxmox.Utils.render_node_cpu_usage,
    },
    {
        itemId: 'wait',
        iconCls: 'fa fa-fw fa-clock-o',
        title: gettext('IO delay'),
        valueField: 'wait',
        rowspan: 2,
    },
    {
        itemId: 'load',
        iconCls: 'fa fa-fw fa-tasks',
        title: gettext('Load average'),
        printBar: false,
        textField: 'loadavg',
    },
    {
        xtype: 'box',
        colspan: 2,
        padding: '0 0 20 0',
    },
    {
        iconCls: 'fa fa-fw pmx-itype-icon-memory pmx-icon',
        itemId: 'memory',
        title: gettext('RAM usage'),
        valueField: 'memory',
        maxField: 'memory',
        renderer: Proxmox.Utils.render_node_size_usage,
    },
    {
        itemId: 'ksm',
        printBar: false,
        title: gettext('KSM sharing'),
        textField: 'ksm',
        renderer: function(record) {
        return Proxmox.Utils.render_size(record.shared);
        },
        padding: '0 10 10 10',
    },
    {
        iconCls: 'fa fa-fw fa-hdd-o',
        itemId: 'rootfs',
        title: '/ ' + gettext('HD space'),
        valueField: 'rootfs',
        maxField: 'rootfs',
        renderer: Proxmox.Utils.render_node_size_usage,
    },
    {
        iconCls: 'fa fa-fw fa-refresh',
        itemId: 'swap',
        printSize: true,
        title: gettext('SWAP usage'),
        valueField: 'swap',
        maxField: 'swap',
        renderer: Proxmox.Utils.render_node_size_usage,
    },
    {
        xtype: 'box',
        colspan: 2,
        padding: '0 0 20 0',
    },
    {
        itemId: 'cpus',
        colspan: 2,
        printBar: false,
        title: gettext('CPU(s)'),
        textField: 'cpuinfo',
        renderer: Proxmox.Utils.render_cpu_model,
        value: '',
    },
    {
        itemId: 'cpumhz',
        colspan: 2,
        printBar: false,
        title: gettext('CPU频率(Hz)'),
        textField: 'cpure',
        renderer: function(value) {// 假设value是一个多行字符串，每行格式为"cpu MHz : 数字"使用换行符分割字符串为数组
        const lines = value.split('\n');// 创建一个数组来存储CPU频率（GHz）的字符串表示
        const cpuGHzStrings = [];// 遍历每一行并提取CPU频率
        for (let i = 0; i < lines.length && i < 63; i++) { // 假设我们想要处理最多64个频率
            const match = lines[i].match(/cpu MHz\s*:\s*(\d+(\.\d+)?)/);
            if (match && match[1]) {// 将MHz转换为GHz，并保留两位小数
                const ghzValue = parseFloat(match[1]) / 1000;// 将格式化后的GHz值（带空格和单位）添加到数组
                cpuGHzStrings.push(ghzValue.toFixed(2) + ' G');//注意这里添加了空格和单位
            }
        }// 将CPU频率数组（GHz字符串）转换为由'|'分隔的字符串并返回
        return `${cpuGHzStrings.join(' | ')}`;// 注意这里不再需要添加'GHz'，因为每个值已经包含了
    },
    },
    {
    itemId: 'sensinfo',
    colspan: 2,
    printBar: false,
    title: gettext('CPU温度'),
    textField: 'sensinfo',
    renderer: function(value) {
        try {
            const cleanedValue = value.replace(/[\x80-\xFF]/g, '');
            const temperatures = JSON.parse(cleanedValue);

            const cpuTemps = [];

            // 遍历temperatures对象中的所有键，寻找以'coretemp-isa-'开头的键
            for (const key in temperatures) {
                if (key.startsWith('coretemp-isa-')) {
                    const coreTempData = temperatures[key];

                    // 处理"Package id X"的温度
                    for (const packageIdKey in coreTempData) {
                        if (packageIdKey.startsWith('Package id ')) {
                            const packageId = packageIdKey.split(' ')[2]; // 提取Package id的数字部分
                            const packageTemp = coreTempData[packageIdKey]?.temp1_input;
                            if (packageTemp && !isNaN(parseFloat(packageTemp))) {
                                cpuTemps.push(`Package ${packageId}: ${parseFloat(packageTemp).toFixed(1)}℃`);
                            }
                        }
                    }

                    // 处理核心温度
                    for (let i = 0; i <= 64; i++) { // 假设最多64个核心，根据实际情况调整
                        const coreKey = `Core ${i}`;
                        const tempKey = `temp${i + 2}_input`;
                        const tempValue = coreTempData[coreKey]?.[tempKey];
                        if (tempValue && !isNaN(parseFloat(tempValue))) {
                            cpuTemps.push(`${coreKey}: ${parseFloat(tempValue).toFixed(1)}℃`);
                        }
                    }
                }
            }

            if (cpuTemps.length === 0) {
                return '没有可用的核心温度数据';
            }

            // 返回连接后的温度字符串
            return `${cpuTemps.join(' | ')}`;
        } catch (error) {
            console.error('处理CPU温度数据时发生错误:', error);
            return '无法获取CPU温度数据（解析错误）';
        }
	},
	},
    {
    itemId: 'mainboardTemp',
    colspan: 2,
    printBar: false,
    title: gettext('主板温度'),
    textField: 'sensinfo', // 注意这里可能需要根据实际情况调整，因为原始数据可能来自不同来源
    renderer: function(value) {
        try {
            const cleanedValue = value.replace(/[\x80-\xFF]/g, '');
            const temperatures = JSON.parse(cleanedValue);

            let mainboardTemp = null;

            // 遍历temperatures对象，寻找所有'acpitz-acpi-*'键
            for (const key in temperatures) {
                if (key.startsWith('acpitz-acpi-')) {
                    const acpitzData = temperatures[key];

                    // 检查是否存在temp1并获取其值
                    if (acpitzData.temp1 && acpitzData.temp1.temp1_input) {
                        const temp = parseFloat(acpitzData.temp1.temp1_input).toFixed(1);
                        if (!isNaN(temp)) {
                            mainboardTemp = `${temp}℃`;
                            break; // 找到第一个有效温度后就退出循环
                        }
                    }
                }
            }

            if (mainboardTemp === null) {
                return '没有可用的主板温度数据';
            }

            return mainboardTemp;
        } catch (error) {
            console.error('处理主板温度数据时发生错误:', error);
            return '无法获取主板温度数据（解析错误）';
        }
    },
    },
    {
    itemId: 'sensinfo1',
    colspan: 2,
    printBar: false,
    title: gettext('风扇转速'),
    textField: 'sensinfo',
    renderer: function(value) {
        // 去除可能存在的非ASCII字符
        const cleanedValue = value.replace(/[\x80-\xFF]/g, '');
        const sensorData = JSON.parse(cleanedValue);
        // 初始化风扇转速数组
        const fanSpeeds = [];
        // 遍历所有nct*前缀的传感器数据
         for (const sensorKey in sensorData) {
            if (sensorKey.startsWith('nct')) { // 检查键是否以nct开头
        // 这里我们不用遍历，采取硬编码，硬件中不会超过10个风扇数据所以不需要遍历
        for (const fanNumber of ['1', '2', '3', '4', '5', '6', '7', '8']) { // 可以根据需要扩展
                    const fanKey = `fan${fanNumber}`;
                    const fanInfo = sensorData[sensorKey][fanKey];
                    if (
                        fanInfo && // 确保 fanInfo 存在且非假值
                        fanInfo[`fan${fanNumber}_input`] !== 0 // 检查对应键的值不是 0
                    ) {
                        // 假设风扇转速以RPM为单位，并四舍五入到整数
                        const fanSpeed = Math.round(fanInfo[`fan${fanNumber}_input`]);
                        if (fanSpeed > 0) { // 通常风扇转速不会是0或负数
                            fanSpeeds.push(`Fan${fanNumber} :${fanSpeed} RPM`);
                        }
                    }
		}
            }
        }
        // 如果fanSpeeds数组为空，则返回一个默认的字符串
        if (fanSpeeds.length === 0) {
            return '没有可用的风扇转速数据';
        }

        // 否则，返回连接后的风扇转速字符串
        return `${fanSpeeds.join(' | ')}`;
    },
    },
    {
        itemId: 'cpu_tdp',
        colspan: 2,
        printBar: false,
        title: gettext('CPU功耗'),
        textField: 'cpu_tdp',
        renderer: function(value) {
        // 假设value是一个字符串，比如"36.88"
        return `TDP: ${value} W`; // 直接将value与单位W拼接
    },
    },
    {
    itemId: 'sensinfo2',
    colspan: 2,
    printBar: false,
    title: gettext('NVME温度'),
    textField: 'sensinfo',
    renderer: function(value) {
        // 去除可能存在的非ASCII字符
        const cleanedValue = value.replace(/[\x80-\xFF]/g, '');
        const temperatures = JSON.parse(cleanedValue);

        // 存储所有NVME适配器的温度
        const nvmeTemps = [];

        // 遍历所有以'nvme'开头的键
        for (const adapterKey in temperatures) {
            if (adapterKey.startsWith('nvme')) {
                const sensorData = temperatures[adapterKey];
                const adapterTemps = [];

                // 检查Composite和其他可能的传感器
                const sensorKeys = Object.keys(sensorData);
                for (const sensorKey of sensorKeys) {
                    const sensor = sensorData[sensorKey];

                    // 假设温度数据存储在类似tempX_input的字段中，其中X是数字
                    for (let i = 1; i <= 10; i++) { // 假设最多有10个温度值，可根据实际情况调整
                        const tempKey = `temp${i}_input`;
                        if (sensor[tempKey] && !isNaN(parseFloat(sensor[tempKey]))) {
                            adapterTemps.push(parseFloat(sensor[tempKey]).toFixed(1) + '℃');
                        }
                    }
                }

                // 如果该适配器有温度数据，则添加到总列表中
                if (adapterTemps.length > 0) {
                    nvmeTemps.push(`${adapterKey}: ${adapterTemps.join(' | ')}`);
                }
            }
        }

        // 如果没有找到任何NVME适配器的温度数据，则返回一个默认的字符串
        if (nvmeTemps.length === 0) {
            return '没有可用的NVME温度数据';
        }

        // 返回所有NVME适配器的温度字符串，用换行符分隔
        return nvmeTemps.join('|');
    },
    },
    {
        colspan: 2,
        title: gettext('Kernel Version'),
        printBar: false,
        // TODO: remove with next major and only use newish current-kernel textfield
        multiField: true,
        //textField: 'current-kernel',
        renderer: ({ data }) => {
        if (!data['current-kernel']) {
            return data.kversion;
        }
        let kernel = data['current-kernel'];
        let buildDate = kernel.version.match(/\((.+)\)\s*$/)?.[1] ?? 'unknown';
        return `${kernel.sysname} ${kernel.release} (${buildDate})`;
        },
        value: '',
    },
    {
        colspan: 2,
        title: gettext('Boot Mode'),
        printBar: false,
        textField: 'boot-info',
        renderer: boot => {
        if (boot.mode === 'legacy-bios') {
            return 'Legacy BIOS';
        } else if (boot.mode === 'efi') {
            return `EFI${boot.secureboot ? ' (Secure Boot)' : ''}`;
        }
        return Proxmox.Utils.unknownText;
        },
        value: '',
    },
    {
        itemId: 'version',
        colspan: 2,
        printBar: false,
        title: gettext('Manager Version'),
        textField: 'pveversion',
        value: '',
    },
    ],

    updateTitle: function() {
    var me = this;
    var uptime = Proxmox.Utils.render_uptime(me.getRecordValue('uptime'));
    me.setTitle(me.pveSelNode.data.node + ' (' + gettext('Uptime') + ': ' + uptime + ')');
    },

    initComponent: function() {
    let me = this;

    let stateProvider = Ext.state.Manager.getProvider();
    let repoLink = stateProvider.encodeHToken({
        view: "server",
        rid: `node/${me.pveSelNode.data.node}`,
        ltab: "tasks",
        nodetab: "aptrepositories",
    });

    me.items.push({
        xtype: 'pmxNodeInfoRepoStatus',
        itemId: 'repositoryStatus',
        product: 'Proxmox VE',
        repoLink: `#${repoLink}`,
    });

    me.callParent();
    },
});
