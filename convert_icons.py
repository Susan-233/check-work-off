import os
from cairosvg import svg2png

def convert_svg_to_png(svg_path, output_dir, sizes):
    # 确保输出目录存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 读取SVG文件
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()
    
    # 转换每个尺寸
    for size in sizes:
        output_path = os.path.join(output_dir, f'icon{size}.png')
        svg2png(bytestring=svg_content,
                write_to=output_path,
                output_width=size,
                output_height=size)
        print(f'Generated {output_path}')

if __name__ == '__main__':
    # 设置路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    svg_path = os.path.join(current_dir, 'icons', 'icon.svg')
    output_dir = os.path.join(current_dir, 'icons')
    
    # 转换不同尺寸
    sizes = [16, 48, 128]
    convert_svg_to_png(svg_path, output_dir, sizes) 