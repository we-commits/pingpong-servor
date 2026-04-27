// 蓝牙通信客户端代码

class BluetoothClient {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.isConnected = false;
    this.state = {
      speed: 50,
      angle: 0,
      frequency: 2.0,
      mode: 'manual',
      isRunning: false
    };
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onStateUpdate: null,
      onError: null
    };
  }

  // 连接蓝牙设备
  async connect() {
    try {
      // 扫描并选择蓝牙设备
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['generic_access'] }],
        optionalServices: ['generic_write']
      });

      // 监听断开连接事件
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      // 连接到设备
      this.server = await this.device.gatt.connect();

      // 获取服务和特征
      const service = await this.server.getPrimaryService('generic_access');
      this.characteristic = await service.getCharacteristic('generic_write');

      // 监听特征值变化
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      this.isConnected = true;
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }

      // 请求设备状态
      this.getState();

      return true;
    } catch (error) {
      console.error('蓝牙连接失败:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('连接失败: ' + error.message);
      }
      return false;
    }
  }

  // 断开连接
  async disconnect() {
    if (this.server) {
      await this.server.disconnect();
    }
    this.isConnected = false;
    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect();
    }
  }

  // 处理断开连接
  handleDisconnect() {
    this.isConnected = false;
    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect();
    }
  }

  // 处理特征值变化
  handleCharacteristicValueChanged(event) {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const data = decoder.decode(value);
    
    try {
      const json = JSON.parse(data);
      if (json.speed !== undefined) {
        // 更新状态
        this.state = json;
        if (this.callbacks.onStateUpdate) {
          this.callbacks.onStateUpdate(this.state);
        }
      } else if (json.ack) {
        console.log('收到确认:', json.ack);
      } else if (json.error) {
        console.error('收到错误:', json.error);
        if (this.callbacks.onError) {
          this.callbacks.onError(json.error);
        }
      }
    } catch (error) {
      console.error('解析数据失败:', error);
    }
  }

  // 发送命令
  async sendCommand(command) {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('未连接到设备');
    }

    try {
      const commandString = JSON.stringify(command) + '\n';
      const encoder = new TextEncoder();
      const data = encoder.encode(commandString);
      
      await this.characteristic.writeValue(data);
      return true;
    } catch (error) {
      console.error('发送命令失败:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('发送命令失败: ' + error.message);
      }
      return false;
    }
  }

  // 获取设备状态
  async getState() {
    return this.sendCommand('getState');
  }

  // 开始发球
  async startServe() {
    return this.sendCommand({
      action: 'start',
      speed: this.state.speed,
      angle: this.state.angle,
      frequency: this.state.frequency,
      mode: this.state.mode
    });
  }

  // 停止发球
  async stopServe() {
    return this.sendCommand({ action: 'stop' });
  }

  // 更新参数
  async updateParameters(params) {
    // 合并参数
    this.state = { ...this.state, ...params };
    
    return this.sendCommand({
      action: 'update',
      speed: this.state.speed,
      angle: this.state.angle,
      frequency: this.state.frequency,
      mode: this.state.mode
    });
  }

  // 设置回调函数
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  // 获取当前状态
  getCurrentState() {
    return { ...this.state };
  }

  // 检查连接状态
  isConnected() {
    return this.isConnected;
  }
}

// 使用示例
/*
const bluetoothClient = new BluetoothClient();

// 设置回调
bluetoothClient.on('connect', () => {
  console.log('蓝牙连接成功');
});

bluetoothClient.on('disconnect', () => {
  console.log('蓝牙连接断开');
});

bluetoothClient.on('stateUpdate', (state) => {
  console.log('状态更新:', state);
  // 更新UI
});

bluetoothClient.on('error', (error) => {
  console.error('错误:', error);
});

// 连接设备
async function connect() {
  await bluetoothClient.connect();
}

// 开始发球
async function start() {
  await bluetoothClient.startServe();
}

// 停止发球
async function stop() {
  await bluetoothClient.stopServe();
}

// 更新参数
async function updateParams() {
  await bluetoothClient.updateParameters({
    speed: 70,
    angle: 15,
    frequency: 3.0,
    mode: 'automatic'
  });
}
*/