from setuptools import setup
from setuptools.command.develop import develop as _develop
from setuptools.command.install import install as _install
from notebook.nbextensions import install_nbextension
from notebook.services.config import ConfigManager
import os

extension_dir = os.path.join(os.path.dirname(__file__), "idaho_map", "static")

class develop(_develop):
    def run(self):
        _develop.run(self)
        install_nbextension(extension_dir, symlink=True,
                            overwrite=True, user=False, destination="idaho_map")
        cm = ConfigManager()
        cm.update('notebook', {"load_extensions": {"idaho_map/index": True } })

class install(_install):
    def run(self):
        _install.run(self)
        cm = ConfigManager()
        cm.update('notebook', {"load_extensions": {"idaho_map/index": True } })

setup(name='idaho-map',
      cmdclass={'develop': develop, 'install': install},
      version='0.2.2',
      description='A wrapper around react-map-gl components for use in jupyter notebooks',
      url='https://github.com/timbr-io/idaho-map',
      author='Chris Helm',
      author_email='chelm@timbr.io',
      license='MIT',
      packages=['idaho_map'],
      zip_safe=False,
      data_files=[
        ('share/jupyter/nbextensions/idaho_map', [
            'idaho_map/static/index.js'
        ]), 
        ('', '*.txt')
      ],
      install_requires=[
          "ipython",
          "jupyter-react",
          "rasterio",
          "gdal",
          "gbdxtools"
        ]
      )
