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

