# Hướng dẫn thêm Mô hình 3D Chân thực (`.glb`) vĩnh viễn lên GitHub

Bạn có thể tải các file mô hình 3D định dạng **`.glb`** (từ Sketchfab, Poly Pizza, Meshy AI, Tripo3D...) và đặt vào thư mục `public/models/` này:

1. Đặt file vào `public/models/`, ví dụ:
   - `public/models/betta.glb`
   - `public/models/guppy.glb`
   - `public/models/rock.glb`
   - `public/models/driftwood.glb`
   - `public/models/plant.glb`

2. Khai báo đường dẫn tương ứng trong `public/models/manifest.json`:

```json
{
  "models": {
    "betta": "./models/betta.glb",
    "guppy": "./models/guppy.glb",
    "rock": "./models/rock.glb",
    "driftwood": "./models/driftwood.glb",
    "plant": "./models/plant.glb"
  }
}
```

Hệ thống sẽ tự động căn chỉnh kích thước, bật đổ bóng PBR và chạy chuyển động xương (`AnimationMixer`) nếu file `.glb` có sẵn animation bơi!
