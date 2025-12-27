import { DeviceEnumType } from "./device-check.enum";

export const accessoryOptions = [
    {
        label: 'Loại 1',
        value: DeviceEnumType.LOAI_1,
        color: 'green',
    },
    {
        label: 'Loại 2',
        value: DeviceEnumType.LOAI_2,
        color: 'blue',
    },
    {
        label: 'Loại 3',
        value: DeviceEnumType.LOAI_3,
        color: 'orange',
    },
    {
        label: 'Loại 4',
        value: DeviceEnumType.LOAI_4,
        color: 'purple',
    },
    {
        label: 'Loại 5',
        value: DeviceEnumType.LOAI_5,
        color: 'red',
    },
    {
        label: 'Chưa cập nhật',
        value: null,
        color: 'gray',
    },
]

export const switchItems = [
    { key: 'wifi', label: 'WiFi' },
    { key: 'bluetooth', label: 'Bluetooth' },
    { key: 'vibration', label: 'Rung' },
    { key: 'gps', label: 'GPS' },
    { key: 'biometrics', label: 'Sinh trắc học' },
    { key: 'mic', label: 'Microphone' },
    { key: 'volumeUp', label: 'Tăng âm lượng' },
    { key: 'volumeDown', label: 'Giảm âm lượng' },
    { key: 'touchScreen', label: 'Màn hình cảm ứng' },
    { key: 'speaker', label: 'Loa' },
    { key: 'headphone', label: 'Tai nghe' }
];

export const additionalItems = [
    { key: 'deviceFrame', label: 'Khung máy' },
    { key: 'pin', label: 'Pin' },
    { key: 'dynamicIsland', label: 'Dynamic Island' },
    { key: 'sim', label: 'SIM' },
    { key: 'lock', label: 'Khóa' }
];

export const modelItems = [
    { value: 'iphone', label: 'iPhone' },
    { value: 'xiaomi', label: 'Xiaomi' },
    { value: 'samsung', label: 'Samsung' },
];

