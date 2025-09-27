# pve-manager

基于PVE管理器的项目分支。

## 功能实现

- CPU频率显示
- 温度显示
- 功耗显示

## 依赖安装

1、温度功耗等信息显示依赖的工具
```bash
apt install lm-sensors
```
2、配置传感器：
```bash
sensors-detect  全部yes加回车
````
```bash
sensors -j  验证配置后的输出
```
3、功耗：

a) 第一步，安装cpupower工具

```bash
apt install linux-cpupower
```
b) 安装完成后，修改一下turbostat的执行权限

```bash
chmod +s /usr/sbin/turbostat
```

c) 解决重启后不生效

```bash
echo msr > /etc/modules-load.d/turbostat.conf
```
4、电源模式配置

a)查看本机支持模式

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
```

b)查看当前性能模式

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

c)设置电源模式可选，使用我们查看到支持的模式

| 电源模式 | 解释说明 |  
| :--: | :--: |  
| performance | 性能模式，将 CPU 频率固定工作在其支持的较高运行频率上，而不动态调节。 |  
| userspace | 系统将变频策略的决策权交给了用户态应用程序，较为灵活。 |  
| powersave | 省电模式，CPU 会固定工作在其支持的最低运行频率上。 |  
| ondemand | 按需快速动态调整 CPU 频率，没有负载的时候就运行在低频，有负载就高频运行。 |  
| conservative | 与 ondemand 不同，平滑地调整 CPU 频率，频率的升降是渐变式的，稍微缓和一点。 |  
| schedutil | 负载变化回调机制，后面新引入的机制，通过触发 schedutil sugov_update 进行调频动。 |

d)推荐配置模式命令：
```bash
echo "ondemand" | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```
e)编写一个服务来实现开机自动切换：
```bash
nano /etc/systemd/system/cpufreq-ondemand.service
```
```bash
[Unit]  
Description=Set CPU scaling governor to ondemand  
After=network.target  
  
[Service]  
ExecStart=/bin/bash -c 'echo "ondemand" | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'   
Type=oneshot  
RemainAfterExit=yes  
  
[Install]  
WantedBy=multi-user.target

```
f)重载服务
```bash
systemctl daemon-reload
```
g)配置开机启动
```bash
systemctl enable cpufreq-ondemand.service
```
h)启动服务
```bash
systemctl start cpufreq-ondemand.service
```
i)查看服务状态
```bash
systemctl status cpufreq-ondemand.service
```