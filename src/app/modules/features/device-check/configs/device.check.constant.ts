import { DeviceEnumType } from "./device-check.enum";

export const accessoryOptions = [
  {
    label: DeviceEnumType.LOAI_1,
    value: 'LOAI_1',
    color: 'green',
  },
  {
    label: DeviceEnumType.LOAI_2,
    value: 'LOAI_2',
    color: 'blue',
  },
  {
    label: DeviceEnumType.LOAI_3,
    value: 'LOAI_3',
    color: 'orange',
  },
  {
    label: DeviceEnumType.LOAI_4,
    value: 'LOAI_4',
    color: 'purple',
  },
  {
    label: DeviceEnumType.LOAI_5,
    value: 'LOAI_5',
    color: 'red',
  }
]

export const switchItems = [
  {
    key: 'wifi',
    label: 'WiFi',
    description: 'Kiểm tra khả năng bật/tắt và kết nối mạng WiFi'
  },
  {
    key: 'bluetooth',
    label: 'Bluetooth',
    description: 'Kiểm tra chức năng bật/tắt và kết nối Bluetooth'
  },
  {
    key: 'vibration',
    label: 'Rung',
    description: 'Kiểm tra phản hồi rung của thiết bị'
  },
  {
    key: 'gps',
    label: 'GPS',
    description: 'Kiểm tra khả năng định vị và xác định vị trí'
  },
  {
    key: 'biometrics',
    label: 'Sinh trắc học',
    description: 'Kiểm tra vân tay hoặc nhận diện khuôn mặt'
  },
  {
    key: 'mic',
    label: 'Microphone',
    description: 'Kiểm tra khả năng thu âm của micro'
  },
  {
    key: 'volumeUp',
    label: 'Tăng âm lượng',
    description: 'Kiểm tra nút tăng âm lượng hoạt động bình thường'
  },
  {
    key: 'volumeDown',
    label: 'Giảm âm lượng',
    description: 'Kiểm tra nút giảm âm lượng hoạt động bình thường'
  },
  {
    key: 'touchScreen',
    label: 'Màn hình cảm ứng',
    description: 'Kiểm tra độ nhạy và phản hồi của màn hình cảm ứng'
  },
  {
    key: 'speaker',
    label: 'Loa',
    description: 'Kiểm tra chất lượng và âm lượng loa'
  },
  {
    key: 'headphone',
    label: 'Tai nghe',
    description: 'Kiểm tra khả năng nhận và phát âm thanh qua tai nghe'
  }
];


export const modelItems = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'xiaomi', label: 'Xiaomi' },
  { value: 'samsung', label: 'Samsung' },
];

export const EnumQuestionTitle: Record<string, string> = {
  PIN_WEB: 'Pin',
  DEVICE_FRAME_WEB: 'Khung viền',
  BACK_SCREEN_WEB: 'Mặt kính sau/ nắp lưng',
  FRONT_SCREEN_WEB: 'Mặt kính trước',
  FUNCTION_WEB: 'Chức năng',
  SCREEN_ERROR_WEB: 'Màn hình',
  MAIN_SCREEN_WEB: 'Màn hình',
  RESET_WEB: 'Khởi động',
  LOCK_WEB: 'Khóa máy',
  POWER_WEB: 'Nguồn'
}